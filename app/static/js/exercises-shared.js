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

// === Compilation LaTeX via latex.js (https://latex.js.org) ===
// Le code LaTeX stocké en base est compilable tel quel par latex.js :
// aucun pré-traitement n'est appliqué. Une éventuelle image (au plus une
// par exercice) est déclarée à l'extérieur du code LaTeX, dans le champ
// image_url, et rendue séparément via appendExerciseImage().

var LATEXJS_BASE = "https://cdn.jsdelivr.net/npm/latex.js@0.12.6/dist/";
var latexjsStylesLoaded = false;

function ensureLatexjsStyles(generator) {
    if (latexjsStylesLoaded || !generator || !generator.stylesAndScripts) return;
    document.head.appendChild(generator.stylesAndScripts(LATEXJS_BASE));
    // latex.js injecte base.css qui cible body/html globalement (display: grid,
    // margin/padding: 0, font-family Computer Modern, text-align: justify)
    // et ecrase le layout centre de retro.css. On restore ici les proprietes
    // critiques pour que le layout reste centre apres le rendu des exercices.
    var fix = document.createElement("style");
    fix.id = "latexjs-layout-fix";
    fix.textContent = [
        "html, body { margin: 0; padding: 0; height: 100%; }",
        "body { display: flex; flex-direction: column; align-items: center; padding: 16px; overflow: hidden; }",
        "html { font-family: inherit; text-align: left; }"
    ].join("");
    document.head.appendChild(fix);
    latexjsStylesLoaded = true;
}

// Compile un texte LaTeX en élément DOM via latex.js (rend les mathématiques
// avec KaTeX). Le code doit être directement compilable : il est passé tel
// quel au parseur.
function latexToHtml(latex) {
    var generator = new latexjs.HtmlGenerator({ hyphenate: false });
    generator = latexjs.parse(latex, { generator: generator });
    ensureLatexjsStyles(generator);
    var frag = generator.domFragment();
    var div = document.createElement("div");
    div.className = "latexjs-body";
    while (frag.firstChild) {
        div.appendChild(frag.firstChild);
    }
    return div;
}

// Affiche un contenu LaTeX dans un élément : version brute (source telle
// quelle) par défaut, version compilée via toggleLatexView. Repli texte
// brut si latex.js n'est pas chargé ou si le parse échoue.
function renderLatexContent(el, latex, defaultView) {
    el.dataset.latex = latex;
    el.dataset.view = "raw";
    el.innerHTML = "";
    if (defaultView !== "raw" && window.latexjs) {
        try {
            el.appendChild(latexToHtml(latex));
            el.dataset.view = "compiled";
        } catch (err) {
            el.textContent = latex;
        }
    } else {
        el.textContent = latex;
    }
}

function toggleLatexView(el) {
    if (el.dataset.view === "compiled") {
        el.dataset.view = "raw";
        el.textContent = el.dataset.latex;
    } else {
        renderLatexContent(el, el.dataset.latex);
    }
}

// === Image d'exercice (au plus une, déclarée hors du code LaTeX) ===

function appendExerciseImage(el, imageUrl, alt) {
    if (!imageUrl) return;
    var img = document.createElement("img");
    img.className = "exercise-image";
    img.src = imageUrl;
    img.alt = alt || "Image de l'exercice";
    el.appendChild(img);
}
