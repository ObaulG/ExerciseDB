from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

from app import auth
from app.database import db

router = APIRouter(prefix="/api/auth", tags=["auth"])


class Credentials(BaseModel):
    pseudo: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=6)


@router.post("/register", status_code=201)
async def register(payload: Credentials) -> dict:
    try:
        user_id = auth.create_user(payload.pseudo, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {"id": user_id, "pseudo": payload.pseudo}


@router.post("/login")
async def login(payload: Credentials, response: Response) -> dict:
    user = auth.authenticate(payload.pseudo, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Pseudo ou mot de passe incorrect.")
    token = auth.create_session(user["id"])
    response.set_cookie(
        auth.SESSION_COOKIE, token, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 7
    )
    return user


@router.post("/logout")
async def logout(request: Request, response: Response) -> dict:
    token = request.cookies.get(auth.SESSION_COOKIE)
    if token:
        auth.delete_session(token)
    response.delete_cookie(auth.SESSION_COOKIE)
    return {"status": "logged_out"}


@router.get("/me")
async def me(request: Request) -> dict:
    user = auth.get_current_user(request)
    if user is None:
        raise HTTPException(status_code=401, detail="Non connecté.")
    return user
