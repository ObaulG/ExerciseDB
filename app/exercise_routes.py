from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.database import db

router = APIRouter(prefix="/api/exercises", tags=["exercises"])


class CorrectionIn(BaseModel):
    text: str = Field(..., min_length=1, description="Texte du corrigé (LaTeX autorisé).")


class ExerciseIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    text: str = Field(..., min_length=1, description="Énoncé de l'exercice (LaTeX autorisé).")
    corrections: list[CorrectionIn] = Field(default_factory=list)


@router.post("", status_code=201)
async def create_exercise(payload: ExerciseIn) -> dict:
    exercise_id = db.create_exercise(
        name=payload.name,
        text=payload.text,
        corrections=[c.text for c in payload.corrections],
    )
    exercise = db.get_exercise(exercise_id)
    return {"id": exercise_id, "exercise": exercise}


@router.get("")
async def list_exercises() -> list[dict]:
    return db.list_exercises()


@router.get("/{exercise_id}")
async def get_exercise(exercise_id: int) -> dict:
    exercise = db.get_exercise(exercise_id)
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercice introuvable")
    return exercise
