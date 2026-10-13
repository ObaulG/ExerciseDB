from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from app.database import db
from app.exercise_routes import router as exercise_router
from app.routes import router as api_router
from fastapi.templating import Jinja2Templates

app = FastAPI(title="Assistant Maths")

BASE_DIR = Path(__file__).resolve().parent

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

templates = Jinja2Templates(directory=BASE_DIR / "templates")

db.init_db()

app.include_router(api_router)
app.include_router(exercise_router)


@app.get("/", response_class=HTMLResponse)
async def chat_page(request: Request):
    return templates.TemplateResponse(request, "chat.html.j2")


@app.get("/exercises", response_class=HTMLResponse)
async def exercises_page(request: Request):
    return templates.TemplateResponse(request, "exercises.html.j2")


@app.get("/health")
async def health():
    return {"status": "ok"}
