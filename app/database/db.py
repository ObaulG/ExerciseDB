from pathlib import Path
from psycopg import connect
from psycopg.rows import dict_row
from os import getenv
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"

DATABASE_URL: str | None = None

_pool = None

from psycopg.errors import UniqueViolation  # noqa: A004

def _get_pool():
    from psycopg.rows import dict_row
    from psycopg_pool import ConnectionPool

    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=DATABASE_URL,
            min_size=1,
            max_size=10,
            kwargs={"autocommit": True, "row_factory": dict_row},
        )
    return _pool


def configure(database_url: str) -> None:
    global DATABASE_URL, _pool
    DATABASE_URL = database_url
    if _pool is not None:
        _pool.close()
        _pool = None


def get_connection():
    conn = connect(
        host=getenv("SUPABASE_HOST"),
        port=6543,
        dbname="postgres",
        user="postgres",
        password=getenv("SUPABASE_PW"),
        sslmode="require",
        row_factory=dict_row,
    )
    conn.autocommit = True
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(SCHEMA_PATH.read_text(encoding="utf-8"))


def _sync_themes(conn, exercise_id: int, themes: list[str]) -> None:
    """Insère les thèmes inconnus dans la table ``theme`` puis crée les liaisons
    dans ``exercise_theme``. Les thèmes existants ne sont pas dupliqués.
    """
    if not themes:
        return
    for label in themes:
        conn.execute(
            "INSERT INTO theme (label) VALUES (%s) ON CONFLICT (label) DO NOTHING",
            (label,),
        )
    rows = conn.execute(
        "SELECT id, label FROM theme WHERE label = ANY(%s)",
        (themes,),
    ).fetchall()
    conn.execute(
        "DELETE FROM exercise_theme WHERE exercise_id = %s",
        (exercise_id,),
    )
    conn.cursor().executemany(
        "INSERT INTO exercise_theme (exercise_id, theme_id) VALUES (%s, %s)",
        [(exercise_id, r["id"]) for r in rows],
    )


def _fetch_themes(conn, exercise_id: int) -> list[str]:
    rows = conn.execute(
        "SELECT t.label FROM theme t "
        "JOIN exercise_theme et ON et.theme_id = t.id "
        "WHERE et.exercise_id = %s ORDER BY t.label",
        (exercise_id,),
    ).fetchall()
    return [r["label"] for r in rows]


def create_exercise(
    name: str,
    text: str,
    corrections: list[str],
    type: str | None = None,
    niveau: str | None = None,
    temps_estime: int | None = None,
    themes: list[str] | None = None,
) -> int:
    with get_connection() as conn:
        row = conn.execute(
            "INSERT INTO exercise (name, text, type, niveau, temps_estime) "
            "VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (name, text, type, niveau, temps_estime),
        ).fetchone()
        exercise_id = row["id"]
        conn.cursor().executemany(
            "INSERT INTO correction (exercise_id, text) VALUES (%s, %s)",
            [(exercise_id, c) for c in corrections],
        )
        _sync_themes(conn, exercise_id, themes or [])
        return exercise_id


def list_exercises() -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, name, text, type, niveau, temps_estime, created_at "
            "FROM exercise ORDER BY id DESC"
        ).fetchall()
        result = []
        for row in rows:
            corrections = conn.execute(
                "SELECT id, text FROM correction WHERE exercise_id = %s ORDER BY id",
                (row["id"],),
            ).fetchall()
            result.append(
                {
                    "id": row["id"],
                    "name": row["name"],
                    "text": row["text"],
                    "type": row["type"],
                    "niveau": row["niveau"],
                    "temps_estime": row["temps_estime"],
                    "themes": _fetch_themes(conn, row["id"]),
                    "created_at": str(row["created_at"]),
                    "corrections": corrections,
                }
            )
        return result


def get_exercise(exercise_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, name, text, type, niveau, temps_estime, created_at "
            "FROM exercise WHERE id = %s",
            (exercise_id,),
        ).fetchone()
        if row is None:
            return None
        corrections = conn.execute(
            "SELECT id, text FROM correction WHERE exercise_id = %s ORDER BY id",
            (exercise_id,),
        ).fetchall()
        return {
            "id": row["id"],
            "name": row["name"],
            "text": row["text"],
            "type": row["type"],
            "niveau": row["niveau"],
            "temps_estime": row["temps_estime"],
            "themes": _fetch_themes(conn, exercise_id),
            "created_at": str(row["created_at"]),
            "corrections": corrections,
        }


def update_exercise(
    exercise_id: int,
    name: str,
    text: str,
    type: str | None = None,
    niveau: str | None = None,
    temps_estime: int | None = None,
    themes: list[str] | None = None,
    corrections: list[str] | None = None,
) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "UPDATE exercise SET name = %s, text = %s, type = %s, niveau = %s, "
            "temps_estime = %s WHERE id = %s RETURNING id",
            (name, text, type, niveau, temps_estime, exercise_id),
        ).fetchone()
        if row is None:
            return None

        if corrections is not None:
            conn.execute("DELETE FROM correction WHERE exercise_id = %s", (exercise_id,))
            conn.cursor().executemany(
                "INSERT INTO correction (exercise_id, text) VALUES (%s, %s)",
                [(exercise_id, c) for c in corrections],
            )

        _sync_themes(conn, exercise_id, themes or [])
        return get_exercise(exercise_id)


def delete_exercise(exercise_id: int) -> bool:
    """Supprime un exercice. Les corrections et liaisons de thèmes sont
    supprimées en cascade grâce aux contraintes ON DELETE CASCADE du schéma.
    Retourne True si une ligne a été supprimée, False sinon.
    """
    with get_connection() as conn:
        row = conn.execute(
            "DELETE FROM exercise WHERE id = %s RETURNING id",
            (exercise_id,),
        ).fetchone()
        return row is not None


def search_exercises(
    query: str | None = None,
    type: str | None = None,
    niveau: str | None = None,
    theme: str | None = None,
    limit: int = 50,
) -> list[dict]:
    """Recherche d'exercices par titre, type, niveau et thème.
    Les corrections ne sont jamais renvoyées (page entraînement).
    """
    with get_connection() as conn:
        sql = (
            "SELECT DISTINCT e.id, e.name, e.text, e.type, e.niveau, "
            "e.temps_estime, e.created_at "
            "FROM exercise e "
        )
        clauses = []
        params: list = []

        if theme:
            sql += "JOIN exercise_theme et ON et.exercise_id = e.id "
            sql += "JOIN theme t ON t.id = et.theme_id "
            clauses.append("t.label = %s")
            params.append(theme)

        if query:
            clauses.append("e.name ILIKE %s")
            params.append(f"%{query}%")

        if type:
            clauses.append("e.type = %s")
            params.append(type)

        if niveau:
            clauses.append("e.niveau = %s")
            params.append(niveau)

        if clauses:
            sql += " WHERE " + " AND ".join(clauses)

        sql += " ORDER BY e.id DESC LIMIT %s"
        params.append(limit)

        rows = conn.execute(sql, params).fetchall()
        result = []
        for row in rows:
            result.append(
                {
                    "id": row["id"],
                    "name": row["name"],
                    "text": row["text"],
                    "type": row["type"],
                    "niveau": row["niveau"],
                    "temps_estime": row["temps_estime"],
                    "themes": _fetch_themes(conn, row["id"]),
                    "created_at": str(row["created_at"]),
                }
            )
        return result


def get_all_themes() -> list[str]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT label FROM theme ORDER BY label"
        ).fetchall()
        return [r["label"] for r in rows]
