import hashlib
import hmac
import secrets
import sqlite3

from fastapi import Request

from app.database import db

SESSION_COOKIE = "session_token"


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 100_000)
    return f"pbkdf2_sha256${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, salt, hexdigest = stored.split("$")
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 100_000)
    return hmac.compare_digest(digest.hex(), hexdigest)


def _is_unique_violation(exc: Exception) -> bool:
    if isinstance(exc, sqlite3.IntegrityError):
        return True
    try:
        from psycopg.errors import UniqueViolation

        return isinstance(exc, UniqueViolation)
    except ImportError:
        return False


def create_user(pseudo: str, password: str) -> int:
    with db.get_connection() as conn:
        try:
            if db._use_postgres():
                row = conn.execute(
                    'INSERT INTO "user" (pseudo, password_hash) VALUES (%s, %s) RETURNING id',
                    (pseudo, hash_password(password)),
                ).fetchone()
                return row["id"]
            cur = conn.execute(
                "INSERT INTO user (pseudo, password_hash) VALUES (?, ?)",
                (pseudo, hash_password(password)),
            )
            return cur.lastrowid
        except Exception as exc:
            if _is_unique_violation(exc):
                raise ValueError("Ce pseudo est déjà pris.")
            raise


def authenticate(pseudo: str, password: str) -> dict | None:
    if db._use_postgres():
        query = 'SELECT id, pseudo, password_hash FROM "user" WHERE LOWER(pseudo) = LOWER(%s)'
        params: tuple = (pseudo,)
    else:
        query = "SELECT id, pseudo, password_hash FROM user WHERE pseudo = ? COLLATE NOCASE"
        params = (pseudo,)
    with db.get_connection() as conn:
        row = conn.execute(query, params).fetchone()
        if row is None or not verify_password(password, row["password_hash"]):
            return None
        return {"id": row["id"], "pseudo": row["pseudo"]}


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    with db.get_connection() as conn:
        conn.execute(
            'INSERT INTO session (token, user_id) VALUES (%s, %s)' if db._use_postgres()
            else "INSERT INTO session (token, user_id) VALUES (?, ?)",
            (token, user_id),
        )
    return token


def delete_session(token: str) -> None:
    with db.get_connection() as conn:
        conn.execute(
            "DELETE FROM session WHERE token = %s" if db._use_postgres()
            else "DELETE FROM session WHERE token = ?",
            (token,),
        )


def get_current_user(request: Request) -> dict | None:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    if db._use_postgres():
        query = 'SELECT u.id, u.pseudo FROM "user" u JOIN session s ON s.user_id = u.id WHERE s.token = %s'
        params: tuple = (token,)
    else:
        query = "SELECT u.id, u.pseudo FROM user u JOIN session s ON s.user_id = u.id WHERE s.token = ?"
        params = (token,)
    with db.get_connection() as conn:
        row = conn.execute(query, params).fetchone()
        return {"id": row["id"], "pseudo": row["pseudo"]} if row else None
