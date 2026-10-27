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
        description=(
            "Feedback pédagogique en français : ce qui est correct, les erreurs "
            "éventuelles et une piste d'amélioration. LaTeX simple uniquement : "
            "pas d'environnement (sauf enumerate/itemize), pas de table, pas de "
            "\\n ; on aère le texte en allant réellement à la ligne."
        ),
    )
    corrected_solution: str = Field(
        ...,
        description=(
            "Solution complète et correcte du problème, avec les étapes détaillées. "
            "LaTeX simple uniquement : pas d'environnement (sauf "
            "enumerate/itemize), pas de table, pas de \\n ; on aère le texte en "
            "allant réellement à la ligne."
        ),
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


class GuidanceOutputSchema(BaseIOSchema):
    """Guidage pédagogique d'un étudiant : on ne donne pas la solution,
    on oriente. Aucune note n'est attribuée."""

    status: str = Field(
        ...,
        description=(
            "Appréciation générale en français parmi : « correct », "
            "« incomplet », « erreurs ». « correct » si la réponse est juste et "
            "complète, « incomplet » si la démarche est bonne mais partielle, "
            "« erreurs » s'il y a des erreurs à corriger."
        ),
    )
    errors: str = Field(
        default="",
        description=(
            "Description en français des erreurs éventuelles, avec leur "
            "emplacement dans le raisonnement. Vide s'il n'y en a pas. LaTeX "
            "simple uniquement : pas d'environnement (sauf enumerate/itemize), "
            "pas de table, pas de \\n ; on aère le texte en allant réellement à "
            "la ligne."
        ),
    )
    hints: str = Field(
        ...,
        description=(
            "Pistes concrètes en français pour corriger les erreurs ou "
            "progresser, sans donner la solution finale. LaTeX simple "
            "uniquement : pas d'environnement (sauf enumerate/itemize), pas de "
            "table, pas de \\n ; on aère le texte en allant réellement à la ligne."
        ),
    )
    missing: str = Field(
        default="",
        description=(
            "Si la réponse est incomplète, points manquants à traiter et "
            "questions orientées pour aider l'étudiant à les combler. Vide si "
            "rien ne manque. LaTeX simple uniquement : pas d'environnement "
            "(sauf enumerate/itemize), pas de table, pas de \\n ; on aère le "
            "texte en allant réellement à la ligne."
        ),
    )


class GuidanceInputSchema(BaseIOSchema):
    """Entrée soumise à l'agent de guidage : le problème et la réponse de
    l'étudiant."""

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
        description="Énoncé complet de l'exercice, en LaTeX compilable directement par latex.js ($...$ / $$...$$).",
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


class CorrectionGenerationInputSchema(BaseIOSchema):
    """Entrée soumise à l'agent de génération de corrigé : l'énoncé d'un exercice."""

    enonce: str = Field(
        ...,
        description="L'énoncé complet de l'exercice à corriger, en LaTeX compilable directement par latex.js.",
    )


class CorrectionGenerationOutputSchema(BaseIOSchema):
    """Corrigé généré par l'agent LLM pour un exercice donné."""

    correction: str = Field(
        ...,
        description="Corrigé complet et détaillé de l'exercice, avec toutes les étapes de résolution, en LaTeX compilable directement par latex.js.",
    )


class ExerciseEditInputSchema(BaseIOSchema):
    """Entrée soumise à l'agent d'édition d'exercice : l'exercice courant
    et l'instruction de modification formulée par l'utilisateur."""

    name: str = Field(default="", description="Titre actuel de l'exercice, éventuellement vide.")
    text: str = Field(default="", description="Énoncé actuel de l'exercice, en LaTeX compilable directement par latex.js.")
    type: str = Field(default="", description="Type actuel de l'exercice.")
    niveau: str = Field(default="", description="Niveau scolaire actuel.")
    temps_estime: int = Field(default=0, ge=0, description="Temps estimé actuel en minutes.")
    themes: list[str] = Field(default_factory=list, description="Thèmes actuels associés à l'exercice.")
    corrections: list[str] = Field(
        default_factory=list,
        description="Corrigés actuels de l'exercice (un par entrée).",
    )
    instruction: str = Field(
        ...,
        description="Instruction en français formulée par l'utilisateur : ce qu'il veut modifier, compléter ou générer (énoncé, corrigé, métadonnées, etc.).",
    )


class ExerciseEditOutputItem(BaseIOSchema):
    """Instance d'exercice modifiée par l'agent LLM. L'utilisateur doit la
    relire et l'appliquer lui-même au formulaire — aucune écriture en base."""

    name: str = Field(default="", description="Titre proposé pour l'exercice.")
    text: str = Field(default="", description="Énoncé complet proposé, en LaTeX compilable directement par latex.js.")
    type: str = Field(default="", description="Type proposé parmi la liste de référence.")
    niveau: str = Field(default="", description="Niveau scolaire proposé parmi la liste de référence.")
    temps_estime: int = Field(default=0, ge=0, description="Temps estimé proposé en minutes.")
    themes: list[str] = Field(default_factory=list, description="Thèmes proposés parmi la liste de référence.")
    corrections: list[str] = Field(
        default_factory=list,
        description="Corrigés proposés (un par entrée), en LaTeX compilable directement par latex.js.",
    )
    summary: str = Field(
        default="",
        description="Résumé court en français des modifications effectuées par l'agent.",
    )


class ExerciseEditOutputSchema(BaseIOSchema):
    """Réponse de l'agent d'édition : une instance d'exercice modifiée."""

    exercise: ExerciseEditOutputItem = Field(
        ...,
        description="L'exercice modifié selon l'instruction de l'utilisateur.",
    )


class VariationInputSchema(BaseIOSchema):
    """Entrée soumise à l'agent de variation : un exercice source complet
    et une instruction optionnelle de l'utilisateur."""

    name: str = Field(default="", description="Titre de l'exercice source.")
    text: str = Field(..., description="Énoncé complet de l'exercice source, en LaTeX compilable directement par latex.js.")
    image_url: str = Field(default="", description="Image de l'exercice source, déclarée hors du code LaTeX.")
    type: str = Field(default="", description="Type de l'exercice source.")
    niveau: str = Field(default="", description="Niveau scolaire de l'exercice source.")
    temps_estime: int = Field(default=0, ge=0, description="Temps estimé de l'exercice source en minutes.")
    themes: list[str] = Field(default_factory=list, description="Thèmes mathématiques associés à l'exercice source.")
    corrections: list[str] = Field(
        default_factory=list,
        description="Corrigés de l'exercice source (un par entrée).",
    )
    instruction: str = Field(
        default="",
        description="Instruction optionnelle en français : notions à explorer, contexte à changer, etc.",
    )


class VariationItem(BaseIOSchema):
    """Une variante générée par l'agent : un nouvel exercice qui approfondit
    le problème source avec d'autres notions mathématiques."""

    name: str = Field(default="", description="Titre proposé pour la variante.")
    text: str = Field(..., description="Énoncé complet de la variante, en LaTeX compilable directement par latex.js.")
    image_url: str = Field(default="", description="Image de la variante, déclarée hors du code LaTeX (vide si réutilisée depuis la source).")
    type: str = Field(default="", description="Type proposé parmi la liste de référence.")
    niveau: str = Field(default="", description="Niveau scolaire proposé parmi la liste de référence.")
    temps_estime: int = Field(default=0, ge=0, description="Temps estimé proposé en minutes.")
    themes: list[str] = Field(default_factory=list, description="Thèmes proposés parmi la liste de référence.")
    corrections: list[str] = Field(
        default_factory=list,
        description="Corrigés proposés (un par entrée), en LaTeX compilable directement par latex.js.",
    )
    summary: str = Field(
        default="",
        description="Résumé court en français décrivant les notions mathématiques exploitées et le lien avec l'exercice source.",
    )


class VariationOutputSchema(BaseIOSchema):
    """Réponse de l'agent de variation : plusieurs variantes d'un exercice."""

    variations: list[VariationItem] = Field(
        ...,
        description="Liste de variantes générées (2 à 3), chacune approfondissant le problème source avec des notions différentes.",
    )
