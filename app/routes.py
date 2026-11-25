from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from typing import Annotated

from app import auth
from app.database import db
from app.llm.agent import evaluate_answer
from app.llm.correction_agent import generate_correction
from app.llm.guidance_agent import guide_answer
from app.llm.rate_limit import enforce_llm_rate_limit
from app.llm.schemas import GuidanceOutputSchema, MathAnswerEvaluationSchema

router = APIRouter(prefix="/api", tags=["chat"])
profile_router = APIRouter(prefix="/api/profile", tags=["profile"])


class EvaluationRequest(BaseModel):
    problem: str
    student_answer: str


@router.post("/evaluate", response_model=MathAnswerEvaluationSchema)
async def evaluate(
    request: EvaluationRequest,
    _: None = Depends(enforce_llm_rate_limit),
) -> MathAnswerEvaluationSchema:
    try:
        return evaluate_answer(request.problem, request.student_answer)
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
    mode: str = Field(
        default="grade",
        description="Modalité de correction : « grade » (note + correction) "
        "ou « guide » (guidage pédagogique sans note ni solution).",
    )


class TrainingEvaluationItem(BaseModel):
    exercise_id: int
    mode: str = Field(..., description="« grade » ou « guide ».")
    evaluation: MathAnswerEvaluationSchema | None = None
    guidance: GuidanceOutputSchema | None = None
    correction_source: str = Field(..., description="« db » ou « generated »")
    completed: bool = Field(
        False,
        description="True si l'exercice est désormais considéré comme complété "
        "(réussi au moins une fois par l'utilisateur connecté). Uniquement "
        "pertinent en mode « grade ».",
    )


@router.post("/training/evaluate")
async def training_evaluate(
    request: Request,
    payload: TrainingEvaluateRequest,
    _: None = Depends(enforce_llm_rate_limit),
) -> dict:
    """Évalue ou guide un batch de réponses, selon la modalité choisie.

    Pour chaque exercice :
    1. Récupère l'exercice en DB.
    2. Si une correction existe en DB, l'utilise comme corrigé de référence.
       Sinon, génère un corrigé via l'agent dédié.
    3. Mode « grade » : appelle l'évaluateur (note + correction).
       Mode « guide » : appelle l'agent de guidage (erreurs, pistes, manques).
    4. Si l'utilisateur est connecté, persiste la tentative (modèle de
       compétences). En mode « grade », marque l'exercice comme complété si
       is_correct. En mode « guide », aucune complétion n'est enregistrée
       (pas de note ni de critère de réussite).
    """
    if payload.mode not in ("grade", "guide"):
        raise HTTPException(
            status_code=422,
            detail="mode doit valoir « grade » ou « guide ».",
        )

    user = auth.get_current_user(request)
    results: list[TrainingEvaluationItem] = []

    for item in payload.answers:
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
                gen = generate_correction(exercise["text"])
                reference_correction = gen.correction
                correction_source = "generated"
            except RuntimeError as exc:
                raise HTTPException(status_code=503, detail=str(exc)) from exc
            except Exception as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"Erreur lors de la génération du corrigé pour l'exercice {item.exercise_id} : {exc}",
                ) from exc

        if payload.mode == "guide":
            try:
                guidance = guide_answer(
                    problem=exercise["text"],
                    student_answer=item.student_answer,
                    reference_correction=reference_correction,
                )
            except RuntimeError as exc:
                raise HTTPException(status_code=503, detail=str(exc)) from exc
            except Exception as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"Erreur lors du guidage de l'exercice {item.exercise_id} : {exc}",
                ) from exc
            results.append(
                TrainingEvaluationItem(
                    exercise_id=item.exercise_id,
                    mode="guide",
                    guidance=guidance,
                    correction_source=correction_source,
                    completed=False,
                )
            )
            continue

        # Mode « grade »
        try:
            evaluation = evaluate_answer(
                problem=exercise["text"],
                student_answer=item.student_answer,
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
                mode="grade",
                evaluation=evaluation,
                correction_source=correction_source,
                completed=False,
            )
        )

    # Persistance des tentatives (modèle de compétences) si l'utilisateur est
    # connecté. En mode « grade » on enregistre la tentative et on calcule les
    # exercices complétés. En mode « guide » on n'enregistre rien : il n'y a ni
    # note ni critère de réussite.
    if user is not None and payload.mode == "grade":
        for item, result in zip(payload.answers, results):
            db.record_attempt(
                user_id=user["id"],
                exercise_id=item.exercise_id,
                student_answer=item.student_answer,
                is_correct=result.evaluation.is_correct,
                score=result.evaluation.score,
                feedback=result.evaluation.feedback,
                corrected_solution=result.evaluation.corrected_solution,
            )
        completed_ids = set(db.get_completed_exercise_ids(user["id"]))
        for result in results:
            result.completed = result.exercise_id in completed_ids

    return {"results": [r.model_dump() for r in results]}


# === Profil : modèle de compétences ===

@profile_router.get("/attempts")
async def profile_attempts(request: Request) -> dict:
    """Historique des tentatives d'évaluation de l'utilisateur connecté."""
    user = auth.get_current_user(request)
    if user is None:
        raise HTTPException(status_code=401, detail="Non connecté.")
    return {"attempts": db.get_user_attempts(user["id"])}


@profile_router.get("/completed")
async def profile_completed(request: Request) -> dict:
    """Identifiants des exercices complétés (réussis au moins une fois) par
    l'utilisateur connecté."""
    user = auth.get_current_user(request)
    if user is None:
        raise HTTPException(status_code=401, detail="Non connecté.")
    return {"completed": db.get_completed_exercise_ids(user["id"])}
