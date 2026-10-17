from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel, Field
from typing import Annotated

from app import auth
from app.database import db
from app.llm.extraction_agent import extract_exercises

router = APIRouter(prefix="/api/exercises", tags=["exercises"])


class CorrectionIn(BaseModel):
    text: str = Field(..., min_length=1, description="Texte du corrigé (LaTeX autorisé).")


class ExerciseIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    text: str = Field(..., min_length=1, description="Énoncé de l'exercice (LaTeX autorisé).")
    type: str | None = Field(None, description="Type d'exercice (application directe, exercice classique, etc.).")
    niveau: str | None = Field(None, description="Niveau scolaire (6e, 5e, 4e, 3e, 2nde, etc.).")
    temps_estime: int | None = Field(None, ge=0, description="Temps estimé en minutes.")
    themes: list[str] = Field(default_factory=list, description="Thèmes mathématiques associés.")
    corrections: list[CorrectionIn] = Field(default_factory=list)


class ExtractionRequest(BaseModel):
    raw_text: str = Field(..., min_length=1, description="Texte brut contenant des exercices à extraire.")


@router.post("/extract")
async def extract(
    payload: ExtractionRequest,
    x_mistral_api_key: Annotated[str | None, Header()] = None,
) -> dict:
    try:
        result = extract_exercises(payload.raw_text, api_key=x_mistral_api_key)
        return {
            "exercises": [
                {
                    "enonce": ex.enonce,
                    "titre": ex.titre,
                    "type": ex.type,
                    "niveau": ex.niveau,
                    "temps": ex.temps_estime,
                    "themes": ex.themes,
                    "correction": ex.correction,
                }
                for ex in result.exercises
            ],
        }
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Erreur lors de l'extraction LLM : {exc}") from exc


@router.post("", status_code=201)
async def create_exercise(payload: ExerciseIn) -> dict:
    exercise_id = db.create_exercise(
        name=payload.name,
        text=payload.text,
        corrections=[c.text for c in payload.corrections],
        type=payload.type,
        niveau=payload.niveau,
        temps_estime=payload.temps_estime,
        themes=payload.themes,
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


@router.put("/{exercise_id}")
async def update_exercise(exercise_id: int, payload: ExerciseIn, request: Request) -> dict:
    user = auth.get_current_user(request)
    if user is None or not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Réservé aux administrateurs.")
    exercise = db.update_exercise(
        exercise_id=exercise_id,
        name=payload.name,
        text=payload.text,
        type=payload.type,
        niveau=payload.niveau,
        temps_estime=payload.temps_estime,
        themes=payload.themes,
        corrections=[c.text for c in payload.corrections],
    )
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercice introuvable")
    return {"id": exercise_id, "exercise": exercise}


@router.delete("/{exercise_id}", status_code=200)
async def delete_exercise(exercise_id: int, request: Request) -> dict:
    user = auth.get_current_user(request)
    if user is None or not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Réservé aux administrateurs.")
    deleted = db.delete_exercise(exercise_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Exercice introuvable")
    return {"id": exercise_id, "status": "deleted"}
