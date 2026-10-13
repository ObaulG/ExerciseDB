from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.llm.agent import evaluate_answer
from app.llm.schemas import MathAnswerEvaluationSchema

router = APIRouter(prefix="/api", tags=["chat"])


class EvaluationRequest(BaseModel):
    problem: str
    student_answer: str


@router.post("/evaluate", response_model=MathAnswerEvaluationSchema)
async def evaluate(request: EvaluationRequest) -> MathAnswerEvaluationSchema:
    try:
        return evaluate_answer(request.problem, request.student_answer)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Erreur lors de l'appel au LLM : {exc}") from exc
