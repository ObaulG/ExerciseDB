import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path

from app.auth_routes import router as auth_router
from app.database import db
from app.exercise_routes import router as exercise_router
from app.routes import router as api_router

app = FastAPI(title="Assistant Maths")

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")

_database_url = os.environ.get("DATABASE_URL", "").strip()
if _database_url:
    db.configure(_database_url)
    print("tentative de connexion à la DB Supabase...")
    if os.environ.get("INIT_DB", "").lower() in ("1", "true", "yes"):
        db.init_db()

app.include_router(api_router)
app.include_router(exercise_router)
app.include_router(auth_router)


@app.get("/", response_class=HTMLResponse)
async def chat_page(request: Request):
    return templates.TemplateResponse(request, "chat.html.j2")


@app.get("/exercises", response_class=HTMLResponse)
async def exercises_page(request: Request):
    return templates.TemplateResponse(request, "exercises.html.j2")


@app.get("/browse", response_class=HTMLResponse)
async def browse_page(request: Request):
    return templates.TemplateResponse(request, "browse.html.j2")


@app.get("/create", response_class=HTMLResponse)
async def create_page(request: Request):
    return templates.TemplateResponse(request, "create.html.j2")


@app.get("/profile", response_class=HTMLResponse)
async def profile_page(request: Request):
    return templates.TemplateResponse(request, "profile.html.j2")


@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    return templates.TemplateResponse(request, "settings.html.j2")


@app.get("/training", response_class=HTMLResponse)
async def training_page(request: Request):
    return templates.TemplateResponse(request, "training.html.j2")


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
