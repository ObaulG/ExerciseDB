import os

import instructor
from mistralai import Mistral

from atomic_agents.agents.atomic_agent import AgentConfig, AtomicAgent, ChatHistory, SystemPromptGenerator

from app.llm.schemas import ExtractionInputSchema, ExtractionOutputSchema

MISTRAL_MODEL = os.environ.get("MISTRAL_MODEL", "ministral-14b-2512")

SYSTEM_PROMPT = SystemPromptGenerator(
    background=[
        "Tu es un assistant spécialisé dans l'extraction et la structuration d'exercices de mathématiques.",
        "Tu reçois le texte brut d'un document (PDF extrait, LaTeX, Typst, ou texte simple) qui contient des exercices de maths.",
        "Ton rôle est d'identifier chaque exercice distinct, d'en extraire l'énoncé complet, et de le structurer avec des métadonnées.",
    ],
    steps=[
        "Identifie chaque exercice individuel dans le texte. Un exercice commence typiquement par « Exercice N », « Ex N », « Exo N », « \\begin{exercice} », « @exercice », « #exercise(...) » (Typst), « Problème N », ou simplement par un changement de section.",
        "Pour les documents Typst, un exercice est délimité par #exercise(title: [...], difficulty: N)[ ... ] et son corrigé par #answer[ ... ]. Le corps de l'exercice est entre crochets ; extrais-le en convertissant les notations mathématiques Typst (plus, minus, times, div, eq, slash, lr(...), bb(...), sqrt(...)) vers le LaTeX équivalent.",
        "Pour chaque exercice, extrais l'énoncé complet en LaTeX compilable directement par latex.js (paragraphes, itemize, enumerate, $...$ / $$...$$).",
        "L'énoncé comprend TOUJOURS le texte de la consigne (phrases introductives et questions hors listes), pas uniquement les itemize/enumerate : conserve la consigne comme paragraphes, suivis des itemize/enumerate le cas échéant. Ne réduis jamais un exercice au seul contenu de ses listes.",
        "Si un corrigé ou une solution accompagne l'exercice dans le texte, extrais-le dans le champ correction.",
        "Détermine le type d'exercice parmi : Application directe, Exercice classique, Exercice normal, Problème, Recherche, Démonstration, Problème complet.",
        "Estime le niveau scolaire parmi : CP, CE1, CE2, CM1, CM2, 6e, 5e, 4e, 3e, 2nde, 1ère, Terminale, Supérieur.",
        "Estime le temps de résolution en minutes.",
        "Associe un ou plusieurs thèmes parmi la liste fournie dans le schéma de sortie.",
        "Si tu trouves un titre court et descriptif pour l'exercice, remplis le champ titre. Sinon laisse-le vide.",
    ],
    output_instructions=[
        "Réponds toujours en français.",
        "Préserve fidèlement le contenu mathématique : ne reformule pas les énoncés, conserve les notations LaTeX.",
        "Ne supprime et ne résume jamais le texte de consigne : les phrases d'introduction et les questions textuelles font partie de l'énoncé et doivent apparaître intégralement, à l'identique du texte source.",
        "Si le texte ne contient aucun exercice identifiable, renvoie une liste vide.",
        "Ne fusionme pas plusieurs exercices en un seul : chaque exercice distinct doit être un élément séparé de la liste.",
        "N'inclus AUCUNE balise d'exercice autour du code (pas de \\begin{exercise}, \\exercise{}, \\exercice, @exercice, #exercise(...) ni titre « Exercice N ») : uniquement le contenu LaTeX situé à l'intérieur de ces balises dans le texte source.",
        "Retire toute commande ou environnement d'image (\\includegraphics, \\begin{figure}...\\end{figure}, \\image, \\epsfig) du LaTeX extrait : les images ne sont pas représentables. Si le contenu de l'image est important, remplace-le par une courte phrase descriptive entre crochets.",
        "Si un exercice n'a pas de corrigé dans le texte source, laisse le champ correction vide.",
        "Le champ temps_estime est en minutes (entier). Si impossible à estimer, mets 0.",
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
    return AtomicAgent[ExtractionInputSchema, ExtractionOutputSchema](
        config=AgentConfig(
            client=client,
            model=MISTRAL_MODEL,
            system_prompt_generator=SYSTEM_PROMPT,
            history=ChatHistory(),
        ),
    )


def extract_exercises(
    raw_text: str, api_key: str | None = None
) -> ExtractionOutputSchema:
    agent = _build_agent(api_key)
    return agent.run(ExtractionInputSchema(raw_text=raw_text))
