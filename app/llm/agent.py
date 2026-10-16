import os

import instructor
from mistralai import Mistral

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

_agent: AtomicAgent | None = None


def get_evaluation_agent() -> AtomicAgent:
    global _agent
    if _agent is None:
        api_key = os.environ.get("MISTRAL_API_KEY")
        if not api_key:
            raise RuntimeError("La variable d'environnement MISTRAL_API_KEY n'est pas définie.")

        mistral_client = Mistral(api_key=api_key)
        client = instructor.from_mistral(mistral_client)

        _agent = AtomicAgent[ProblemInputSchema, MathAnswerEvaluationSchema](
            config=AgentConfig(
                client=client,
                model=MISTRAL_MODEL,
                system_prompt_generator=SYSTEM_PROMPT,
                history=ChatHistory(),
            )
        )
    return _agent


def evaluate_answer(problem: str, student_answer: str) -> MathAnswerEvaluationSchema:
    agent = get_evaluation_agent()
    agent.history = ChatHistory()
    return agent.run(ProblemInputSchema(problem=problem, student_answer=student_answer))
