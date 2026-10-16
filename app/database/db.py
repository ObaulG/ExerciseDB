from pathlib import Path

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
    """Contexte de connexion PostgreSQL (Supabase) emprunté au pool psycopg.

    La connexion est rendue au pool à la sortie du bloc ``with``.
    """
    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL n'est pas configurée. "
            "Définissez-la avec l'URI de connexion de votre projet Supabase."
        )
    return _get_pool().connection()


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(SCHEMA_PATH.read_text(encoding="utf-8"))


def create_exercise(name: str, text: str, corrections: list[str]) -> int:
    with get_connection() as conn:
        row = conn.execute(
            "INSERT INTO exercise (name, text) VALUES (%s, %s) RETURNING id",
            (name, text),
        ).fetchone()
        exercise_id = row["id"]
        conn.cursor().executemany(
            "INSERT INTO correction (exercise_id, text) VALUES (%s, %s)",
            [(exercise_id, c) for c in corrections],
        )
        return exercise_id


def list_exercises() -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, name, text, created_at FROM exercise ORDER BY id DESC"
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
                    "created_at": str(row["created_at"]),
                    "corrections": corrections,
                }
            )
        return result


def get_exercise(exercise_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, name, text, created_at FROM exercise WHERE id = %s",
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
            "created_at": str(row["created_at"]),
            "corrections": corrections,
        }
