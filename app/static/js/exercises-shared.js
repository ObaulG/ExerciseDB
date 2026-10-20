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

// === LaTeX vers HTML (itemize, enumerate, multicols, \item) ===

function escapeHtmlText(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Un seul parcours : segments mathématiques préservés tels quels (rendus
// ensuite par KaTeX), environnements convertis en HTML avec un état
// persistant sur toute la chaîne (listes imbriquées, multicols).
var LATEX_TOKEN_RE = /\$\$[\s\S]*?\$\$|\$[^$\n]*?\$|\\begin\{(?:itemize|enumerate|multicols)\}(?:\s*\{(\d+)\})?|\\end\{(?:itemize|enumerate|multicols)\}|\\item\b/g;

function latexToHtml(latex) {
    var html = "";
    var listStack = [];
    var inItem = false;
    var colsDepth = 0;
    var lastIndex = 0;
    var m;
    LATEX_TOKEN_RE.lastIndex = 0;
    while ((m = LATEX_TOKEN_RE.exec(latex)) !== null) {
        html += escapeHtmlText(latex.slice(lastIndex, m.index)).replace(/\r?\n/g, "<br>");
        var token = m[0];
        if (token.charAt(0) === "$") {
            html += token;
        } else {
            var beginMatch = /^\\begin\{(itemize|enumerate|multicols)\}(?:\s*\{(\d+)\})?$/.exec(token);
            if (beginMatch) {
                var env = beginMatch[1];
                if (env === "multicols") {
                    var cols = beginMatch[2] || "2";
                    html += '<div class="latex-multicols" style="column-count:' + cols + '">';
                    colsDepth++;
                } else {
                    html += env === "itemize" ? "<ul>" : "<ol>";
                    listStack.push(env);
                }
            } else if (/^\\end\{/.test(token)) {
                var endEnv = /^\\end\{(itemize|enumerate|multicols)\}$/.exec(token)[1];
                if (endEnv === "multicols") {
                    if (colsDepth > 0) {
                        html += "</div>";
                        colsDepth--;
                    }
                } else if (listStack.length > 0 && listStack[listStack.length - 1] === endEnv) {
                    if (inItem) {
                        html += "</li>";
                        inItem = false;
                    }
                    html += endEnv === "itemize" ? "</ul>" : "</ol>";
                    listStack.pop();
                }
            } else { // \item
                if (inItem) {
                    html += "</li>";
                }
                if (listStack.length > 0) {
                    html += "<li>";
                    inItem = true;
                } else {
                    html += '<span class="latex-item-dot">&#8226;&nbsp;</span>';
                }
            }
        }
        lastIndex = m.index + token.length;
    }
    html += escapeHtmlText(latex.slice(lastIndex)).replace(/\r?\n/g, "<br>");
    while (inItem) {
        html += "</li>";
        inItem = false;
    }
    while (listStack.length > 0) {
        html += listStack.pop() === "itemize" ? "</ul>" : "</ol>";
    }
    while (colsDepth > 0) {
        html += "</div>";
        colsDepth--;
    }
    html = html.replace(/<br>(<\/(?:li|ul|ol|div)>)/g, "$1")
               .replace(/(<(?:ul|ol|div[^>]*)>)<br>/g, "$1");
    return html;
}

// Convertit un texte LaTeX en texte brut : les commandes d'environnement
// sont retirées, \item devient une puce.
function latexToPlainText(latex) {
    return latex
        .replace(/\\begin\{multicols\}\s*\{(\d+)\}|\\begin\{(?:itemize|enumerate)\}|\\end\{(?:itemize|enumerate|multicols)\}/g, "")
        .replace(/\\item\b/g, "\u2022 ");
}

// Affiche un contenu LaTeX dans un élément, avec rendu compilé (HTML +
// KaTeX) et bascule vers le texte brut.
function renderLatexContent(el, latex) {
    el.dataset.latex = latex;
    el.dataset.view = "compiled";
    el.innerHTML = latexToHtml(latex);
    renderMath(el);
}

function toggleLatexView(el) {
    if (el.dataset.view === "compiled") {
        el.dataset.view = "raw";
        el.textContent = latexToPlainText(el.dataset.latex);
    } else {
        renderLatexContent(el, el.dataset.latex);
    }
}
