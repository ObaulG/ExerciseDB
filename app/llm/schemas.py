from pydantic import Field

from atomic_agents.agents.atomic_agent import BaseIOSchema


class MathAnswerEvaluationSchema(BaseIOSchema):
    """Évaluation structurée de la réponse d'un étudiant à un problème de maths."""

    is_correct: bool = Field(
        ...,
        description="True si la réponse de l'étudiant est mathématiquement correcte (raisonnement et résultat).",
    )
    score: int = Field(
        ...,
        ge=0,
        le=10,
        description="Note sur 10 évaluant la justesse et la qualité de la démarche.",
    )
    feedback: str = Field(
        ...,
        description="Feedback pédagogique en français : ce qui est correct, les erreurs éventuelles et une piste d'amélioration.",
    )
    corrected_solution: str = Field(
        ...,
        description="Solution complète et correcte du problème, avec les étapes détaillées.",
    )


class ProblemInputSchema(BaseIOSchema):
    """Entrée soumise à l'agent : le problème et la réponse de l'étudiant."""

    problem: str = Field(
        ...,
        description="L'énoncé complet du problème de mathématiques.",
    )
    student_answer: str = Field(
        ...,
        description="La réponse rédigée par l'étudiant, avec son raisonnement tel quel.",
    )
