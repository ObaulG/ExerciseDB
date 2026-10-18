// === Constantes et utilitaires partagés entre les pages d'exercices ===

const TYPES_EXERCICE = [
    "Application directe",
    "Exercice classique",
    "Exercice normal",
    "Problème",
    "Recherche",
    "Démonstration",
    "Problème complet",
];

const NIVEAUX_SCOLAIRES = [
    "CP", "CE1", "CE2", "CM1", "CM2",
    "6e", "5e", "4e", "3e",
    "2nde", "1ère", "Terminale", "Supérieur",
];

const THEMES_DISPONIBLES = [
    "Calcul — opérations élémentaires",
    "Fractions",
    "Géométrie",
    "Logique et raisonnement",
    "Probabilités",
    "Calcul littéral",
    "Nombres décimaux",
    "Proportionnalité",
    "Statistiques",
    "Fonctions",
    "Équations et inéquations",
    "Suites",
    "Trigonométrie",
    "Vecteurs",
    "Dérivation",
    "Intégrales",
    "Nombres relatifs",
    "Puissances",
    "Racines carrées",
    "Théorème de Pythagore",
    "Théorème de Thalès",
];

// === Rendu KaTeX ===

function renderMath(element) {
    if (window.renderMathInElement) {
        renderMathInElement(element, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false },
            ],
            throwOnError: false,
        });
    }
}
