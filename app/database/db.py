import os
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent.parent / "exercises.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"
SCHEMA_POSTGRES_PATH = Path(__file__).resolve().parent / "schema_postgres.sql"

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()

_pool = None


def _use_postgres() -> bool:
    return DATABASE_URL != ""


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


def get_connection():
    """Contexte de connexion.

    SQLite : connexion sqlite3 (commit automatique à la sortie du bloc ``with``).
    PostgreSQL (Supabase) : contexte fourni par le pool psycopg, la connexion
    est rendue au pool à la sortie du bloc.
    """
    if _use_postgres():
        return _get_pool().connection()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    if _use_postgres():
        with get_connection() as conn:
            conn.execute(SCHEMA_POSTGRES_PATH.read_text(encoding="utf-8"))
        return
    with get_connection() as conn:
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))


def create_exercise(name: str, text: str, corrections: list[str]) -> int:
    if _use_postgres():
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
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO exercise (name, text) VALUES (?, ?)",
            (name, text),
        )
        exercise_id = cur.lastrowid
        conn.executemany(
            "INSERT INTO correction (exercise_id, text) VALUES (?, ?)",
            [(exercise_id, c) for c in corrections],
        )
        return exercise_id


def list_exercises() -> list[dict]:
    if _use_postgres():
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
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, name, text, created_at FROM exercise ORDER BY id DESC"
        ).fetchall()
        result = []
        for row in rows:
            corrections = conn.execute(
                "SELECT id, text FROM correction WHERE exercise_id = ? ORDER BY id",
                (row["id"],),
            ).fetchall()
            result.append(
                {
                    "id": row["id"],
                    "name": row["name"],
                    "text": row["text"],
                    "created_at": row["created_at"],
                    "corrections": [dict(c) for c in corrections],
                }
            )
        return result


def get_exercise(exercise_id: int) -> dict | None:
    if _use_postgres():
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
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, name, text, created_at FROM exercise WHERE id = ?",
            (exercise_id,),
        ).fetchone()
        if row is None:
            return None
        corrections = conn.execute(
            "SELECT id, text FROM correction WHERE exercise_id = ? ORDER BY id",
            (exercise_id,),
        ).fetchall()
        return {
            "id": row["id"],
            "name": row["name"],
            "text": row["text"],
            "created_at": row["created_at"],
            "corrections": [dict(c) for c in corrections],
        }
