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


class ExtractedExerciseItem(BaseIOSchema):
    """Un exercice extrait d'un document par l'agent LLM."""

    enonce: str = Field(
        ...,
        description="Énoncé complet de l'exercice, en LaTeX balisé ($...$ / $$...$$) si nécessaire.",
    )
    titre: str = Field(
        default="",
        description="Titre court de l'exercice, optionnel. Laisser vide si aucun titre n'est évident.",
    )
    type: str = Field(
        default="",
        description=(
            "Type d'exercice parmi : Application directe, Exercice classique, "
            "Exercice normal, Problème, Recherche, Démonstration, Problème complet."
        ),
    )
    niveau: str = Field(
        default="",
        description=(
            "Niveau scolaire parmi : CP, CE1, CE2, CM1, CM2, 6e, 5e, 4e, 3e, "
            "2nde, 1ère, Terminale, Supérieur."
        ),
    )
    temps_estime: int = Field(
        default=0,
        ge=0,
        description="Temps estimé pour résoudre l'exercice, en minutes.",
    )
    themes: list[str] = Field(
        default_factory=list,
        description=(
            "Thèmes mathématiques associés, parmi : "
            "Calcul — opérations élémentaires, Fractions, Géométrie, "
            "Logique et raisonnement, Probabilités, Calcul littéral, "
            "Nombres décimaux, Proportionnalité, Statistiques, Fonctions, "
            "Équations et inéquations, Suites, Trigonométrie, Vecteurs, "
            "Dérivation, Intégrales, Nombres relatifs, Puissances, "
            "Racines carrées, Théorème de Pythagore, Théorème de Thalès."
        ),
    )
    correction: str = Field(
        default="",
        description="Corrigé complet de l'exercice avec les étapes de résolution, en LaTeX si nécessaire. Vide si non disponible.",
    )


class ExtractionInputSchema(BaseIOSchema):
    """Entrée soumise à l'agent d'extraction : le texte brut d'un document."""

    raw_text: str = Field(
        ...,
        description="Le texte brut extrait d'un document (PDF, LaTeX, Typst, etc.) contenant des exercices de mathématiques.",
    )


class ExtractionOutputSchema(BaseIOSchema):
    """Liste structurée d'exercices extraits d'un document par l'agent LLM."""

    exercises: list[ExtractedExerciseItem] = Field(
        ...,
        description="La liste des exercices identifiés dans le document, avec leurs métadonnées et corrections.",
    )
