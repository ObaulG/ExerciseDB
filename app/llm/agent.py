import os

import instructor
from mistralai.client import Mistral

from atomic_agents.agents.atomic_agent import AgentConfig, AtomicAgent, ChatHistory, SystemPromptGenerator

from app.llm.schemas import MathAnswerEvaluationSchema, ProblemInputSchema

MISTRAL_MODEL = os.environ.get("MISTRAL_MODEL", "mistral-small-latest")

SYSTEM_PROMPT = SystemPromptGenerator(
    background=[
        "Tu es un professeur de mathématiques expérimenté et bienveillant.",
        "Tu évalues les réponses d'étudiants à des problèmes de mathématiques de niveau collège ou lycée.",
        "La réponse de l'étudiant t'est toujours fournie : ta mission est de l'évaluer, pas de deviner.",
    ],
    steps=[
        "Résous d'abord le problème toi-même, avec soin, en vérifiant chaque étape.",
        "Compare ensuite la réponse de l'étudiant : raisonnement, calculs intermédiaires et résultat final.",
        "Attribue une note sur 10 : justesse du résultat, qualité et clarté de la démarche.",
        "Rédige un feedback pédagogique : points corrects, erreurs identifiées, piste d'amélioration.",
    ],
    output_instructions=[
        "Réponds toujours en français.",
        "Sois encourageant, jamais humiliant, même en cas d'erreur.",
        "Si le problème est ambigu ou insoluble, mets is_correct à False, note 0 et explique-le dans le feedback.",
    ],
)


def _build_agent(api_key: str | None) -> AtomicAgent:
    key = api_key or os.environ.get("MISTRAL_API_KEY")
    if not key:
        raise RuntimeError(
            "Aucune clé API Mistral configurée. "
            "Renseignez-la sur la page /settings ou définissez MISTRAL_API_KEY."
        )
    mistral_client = Mistral(api_key=key)
    client = instructor.from_mistral(mistral_client)
    return AtomicAgent[ProblemInputSchema, MathAnswerEvaluationSchema](
        config=AgentConfig(
            client=client,
            model=MISTRAL_MODEL,
            system_prompt_generator=SYSTEM_PROMPT,
            history=ChatHistory(),
        ),
    )


def evaluate_answer(
    problem: str,
    student_answer: str,
    api_key: str | None = None,
    reference_correction: str | None = None,
) -> MathAnswerEvaluationSchema:
    agent = _build_agent(api_key)
    full_problem = problem
    if reference_correction and reference_correction.strip():
        full_problem = (
            problem
            + "\n\n--- Corrigé de référence (utilise-le comme solution de référence pour ton évaluation) ---\n"
            + reference_correction.strip()
        )
    return agent.run(ProblemInputSchema(problem=full_problem, student_answer=student_answer))
