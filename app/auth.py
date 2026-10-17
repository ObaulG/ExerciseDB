import hashlib
import hmac
import secrets

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


def create_user(pseudo: str, password: str) -> int:
    with db.get_connection() as conn:
        try:
            row = conn.execute(
                'INSERT INTO "user" (pseudo, password_hash) VALUES (%s, %s) RETURNING id',
                (pseudo, hash_password(password)),
            ).fetchone()
            return row["id"]
        except db.UniqueViolation:
            raise ValueError("Ce pseudo est déjà pris.")


def authenticate(pseudo: str, password: str) -> dict | None:
    with db.get_connection() as conn:
        row = conn.execute(
            'SELECT id, pseudo, password_hash, is_admin FROM "user" WHERE LOWER(pseudo) = LOWER(%s)',
            (pseudo,),
        ).fetchone()
        if row is None or not verify_password(password, row["password_hash"]):
            return None
        return {"id": row["id"], "pseudo": row["pseudo"], "is_admin": row["is_admin"]}


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    with db.get_connection() as conn:
        conn.execute(
            "INSERT INTO session (token, user_id) VALUES (%s, %s)",
            (token, user_id),
        )
    return token


def delete_session(token: str) -> None:
    with db.get_connection() as conn:
        conn.execute("DELETE FROM session WHERE token = %s", (token,))


def get_current_user(request: Request) -> dict | None:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    with db.get_connection() as conn:
        row = conn.execute(
            'SELECT u.id, u.pseudo, u.is_admin FROM "user" u JOIN session s ON s.user_id = u.id WHERE s.token = %s',
            (token,),
        ).fetchone()
        if row is None:
            return None
        return {"id": row["id"], "pseudo": row["pseudo"], "is_admin": row["is_admin"]}
