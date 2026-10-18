import os

import instructor
from mistralai import Mistral

from atomic_agents.agents.atomic_agent import AgentConfig, AtomicAgent, ChatHistory, SystemPromptGenerator

from app.llm.schemas import CorrectionGenerationInputSchema, CorrectionGenerationOutputSchema

MISTRAL_MODEL = os.environ.get("MISTRAL_MODEL", "mistral-small-latest")

SYSTEM_PROMPT = SystemPromptGenerator(
    background=[
        "Tu es un professeur de mathématiques expérimenté.",
        "Tu reçois l'énoncé d'un exercice de mathématiques et tu dois produire un corrigé complet et détaillé.",
        "Le corrigé doit contenir toutes les étapes de résolution, clairement justifiées.",
    ],
    steps=[
        "Lis attentivement l'énoncé et identifie ce qui est demandé.",
        "Résous l'exercice étape par étape, en justifiant chaque étape.",
        "Vérifie ton résultat final.",
        "Rédige le corrigé complet avec les notations mathématiques en LaTeX ($...$ / $$...$$).",
    ],
    output_instructions=[
        "Réponds toujours en français.",
        "Préserve les notations mathématiques en LaTeX.",
        "Sois précis et pédagogique.",
        "Le corrigé doit être suffisant pour qu'un étudiant puisse comprendre la méthode employée.",
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
    return AtomicAgent[CorrectionGenerationInputSchema, CorrectionGenerationOutputSchema](
        config=AgentConfig(
            client=client,
            model=MISTRAL_MODEL,
            system_prompt_generator=SYSTEM_PROMPT,
            history=ChatHistory(),
        ),
    )


def generate_correction(
    enonce: str, api_key: str | None = None
) -> CorrectionGenerationOutputSchema:
    agent = _build_agent(api_key)
    return agent.run(CorrectionGenerationInputSchema(enonce=enonce))
