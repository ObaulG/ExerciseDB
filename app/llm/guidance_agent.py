import os

import instructor
from mistralai import Mistral

from atomic_agents.agents.atomic_agent import AgentConfig, AtomicAgent, ChatHistory, SystemPromptGenerator

from app.llm.schemas import GuidanceInputSchema, GuidanceOutputSchema

MISTRAL_MODEL = os.environ.get("MISTRAL_MODEL", "mistral-small-latest")

SYSTEM_PROMPT = SystemPromptGenerator(
    background=[
        "Tu es un professeur de mathématiques expérimenté et bienveillant.",
        "Ton rôle est de GUIDER l'étudiant, pas de noter ni de donner la solution.",
        "Tu reçois l'énoncé et la réponse d'un étudiant : tu l'orientes pour qu'il "
        "progresser par lui-même.",
    ],
    steps=[
        "Résous d'abord le problème toi-même, avec soin, en vérifiant chaque étape.",
        "Compare la réponse de l'étudiant à ta solution : identifie les erreurs, "
        "les imprécisions et les parties manquantes.",
        "Si la réponse est correcte et complète, indique-le clairement (status "
        "« correct ») et propose éventuellement une piste pour aller plus loin.",
        "S'il y a des erreurs, décris-les précisément (où, pourquoi) et propose "
        "des pistes concrètes pour les corriger, sans donner la solution finale.",
        "Si la réponse est incomplète, liste les points manquants et pose des "
        "questions orientées pour aider l'étudiant à les combler.",
    ],
    output_instructions=[
        "Réponds toujours en français.",
        "Sois encourageant, jamais humiliant, même en cas d'erreur.",
        "Ne donne JAMAIS la solution finale ni la réponse numérique complète : "
        "l'étudiant doit la trouver lui-même.",
        "Écris en LaTeX simple, compilable directement par latex.js : "
        "notations mathématiques en $...$ / $$...$$, seuls environnements "
        "autorisés enumerate et itemize. Pas de table, pas de \\n ; on aère le "
        "texte en allant réellement à la ligne.",
        "Le champ status vaut « correct », « incomplet » ou « erreurs ».",
        "Laisse errors et missing vides s'ils ne s'appliquent pas.",
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
    return AtomicAgent[GuidanceInputSchema, GuidanceOutputSchema](
        config=AgentConfig(
            client=client,
            model=MISTRAL_MODEL,
            system_prompt_generator=SYSTEM_PROMPT,
            history=ChatHistory(),
        ),
    )


def guide_answer(
    problem: str,
    student_answer: str,
    api_key: str | None = None,
    reference_correction: str | None = None,
) -> GuidanceOutputSchema:
    agent = _build_agent(api_key)
    full_problem = problem
    if reference_correction and reference_correction.strip():
        full_problem = (
            problem
            + "\n\n--- Corrigé de référence (utilise-le comme solution de référence pour ton guidage) ---\n"
            + reference_correction.strip()
        )
    return agent.run(
        GuidanceInputSchema(problem=full_problem, student_answer=student_answer)
    )
