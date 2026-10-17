from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel, Field
from typing import Annotated

from app.database import db
from app.llm.agent import evaluate_answer
from app.llm.correction_agent import generate_correction
from app.llm.schemas import MathAnswerEvaluationSchema

router = APIRouter(prefix="/api", tags=["chat"])


class EvaluationRequest(BaseModel):
    problem: str
    student_answer: str


@router.post("/evaluate", response_model=MathAnswerEvaluationSchema)
async def evaluate(
    request: EvaluationRequest,
    x_mistral_api_key: Annotated[str | None, Header()] = None,
) -> MathAnswerEvaluationSchema:
    try:
        return evaluate_answer(
            request.problem, request.student_answer, api_key=x_mistral_api_key
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Erreur lors de l'appel au LLM : {exc}") from exc


# === Recherche d'exercices (page entraînement) ===

@router.get("/exercises/search")
async def search_exercises(
    q: Annotated[str | None, Query()] = None,
    type: Annotated[str | None, Query()] = None,
    niveau: Annotated[str | None, Query()] = None,
    theme: Annotated[str | None, Query()] = None,
) -> dict:
    """Recherche d'exercices par titre, type, niveau, thème.
    Les corrections ne sont jamais renvoyées."""
    results = db.search_exercises(query=q, type=type, niveau=niveau, theme=theme)
    return {"exercises": results}


@router.get("/themes")
async def list_themes() -> dict:
    return {"themes": db.get_all_themes()}


# === Évaluation d'entraînement (batch) ===

class TrainingAnswerItem(BaseModel):
    exercise_id: int
    student_answer: str = Field(..., min_length=1)


class TrainingEvaluateRequest(BaseModel):
    answers: list[TrainingAnswerItem] = Field(..., min_length=1, max_length=6)


class TrainingEvaluationItem(BaseModel):
    exercise_id: int
    evaluation: MathAnswerEvaluationSchema
    correction_source: str = Field(..., description="« db » ou « generated »")


@router.post("/training/evaluate")
async def training_evaluate(
    request: TrainingEvaluateRequest,
    x_mistral_api_key: Annotated[str | None, Header()] = None,
) -> dict:
    """Évalue un batch de réponses. Pour chaque exercice :
    1. Récupère l'exercice en DB.
    2. Si une correction existe en DB, l'utilise comme corrigé de référence.
    3. Sinon, génère un corrigé via l'agent dédié.
    4. Appelle l'évaluateur avec le corrigé injecté dans le prompt.
    """
    results: list[TrainingEvaluationItem] = []

    for item in request.answers:
        exercise = db.get_exercise(item.exercise_id)
        if exercise is None:
            raise HTTPException(
                status_code=404,
                detail=f"Exercice {item.exercise_id} introuvable",
            )

        # Récupère ou génère le corrigé de référence
        corrections = exercise.get("corrections") or []
        if corrections:
            reference_correction = corrections[0]["text"]
            correction_source = "db"
        else:
            try:
                gen = generate_correction(
                    exercise["text"], api_key=x_mistral_api_key
                )
                reference_correction = gen.correction
                correction_source = "generated"
            except RuntimeError as exc:
                raise HTTPException(status_code=503, detail=str(exc)) from exc
            except Exception as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"Erreur lors de la génération du corrigé pour l'exercice {item.exercise_id} : {exc}",
                ) from exc

        # Évalue la réponse avec le corrigé de référence
        try:
            evaluation = evaluate_answer(
                problem=exercise["text"],
                student_answer=item.student_answer,
                api_key=x_mistral_api_key,
                reference_correction=reference_correction,
            )
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Erreur lors de l'évaluation de l'exercice {item.exercise_id} : {exc}",
            ) from exc

        results.append(
            TrainingEvaluationItem(
                exercise_id=item.exercise_id,
                evaluation=evaluation,
                correction_source=correction_source,
            )
        )

    return {"results": [r.model_dump() for r in results]}
