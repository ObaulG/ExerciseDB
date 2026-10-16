import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent.parent / "exercises.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))


def create_exercise(name: str, text: str, corrections: list[str]) -> int:
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
