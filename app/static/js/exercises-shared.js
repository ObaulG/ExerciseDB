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

// === Compilation LaTeX via latex.js (https://latex.js.org) ===
// La bibliothèque est chargée depuis le CDN dans les pages qui en ont
// besoin ; latexjs.parse() gère itemize, enumerate, les commandes de mise
// en forme et rend les mathématiques ($...$ / $$...$$) via KaTeX.
// Les environnements multicols ne sont pas supportés par latex.js : ils
// sont extraits au préalable et rendus en colonnes CSS, leur contenu est
// compilé séparément (les \item isolés y sont encapsulés en itemize).

var LATEXJS_BASE = "https://cdn.jsdelivr.net/npm/latex.js@0.12.6/dist/";
var latexjsStylesLoaded = false;

function ensureLatexjsStyles(generator) {
    if (latexjsStylesLoaded || !generator || !generator.stylesAndScripts) return;
    document.head.appendChild(generator.stylesAndScripts(LATEXJS_BASE));
    latexjsStylesLoaded = true;
}

// === Images ===
// Les images sont insérées dans le texte avec la syntaxe Markdown
// ![texte alternatif](/static/images/...). latex.js ne supporte pas
// \includegraphics : on remplace chaque marqueur par un placeholder unique
// avant la compilation, puis on substitue le <img> correspondant dans le
// fragment DOM généré.

var LATEX_IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)\)/g;

function extractImages(latex) {
    var images = [];
    var text = latex.replace(LATEX_IMAGE_RE, function (m, alt, url) {
        images.push({ alt: alt, url: url });
        return "@@IMG" + (images.length - 1) + "@@";
    });
    return { text: text, images: images };
}

function replacePlaceholderInTextNode(node, placeholder, buildElement) {
    var parts = node.nodeValue.split(placeholder);
    var frag = document.createDocumentFragment();
    for (var i = 0; i < parts.length; i++) {
        if (i > 0) {
            frag.appendChild(buildElement());
        }
        if (parts[i]) {
            frag.appendChild(document.createTextNode(parts[i]));
        }
    }
    node.parentNode.replaceChild(frag, node);
}

function collectTextNodes(root, acc) {
    acc = acc || [];
    for (var i = 0; i < root.childNodes.length; i++) {
        var child = root.childNodes[i];
        if (child.nodeType === 3) {
            acc.push(child);
        } else if (child.nodeType === 1) {
            collectTextNodes(child, acc);
        }
    }
    return acc;
}

function restoreImages(element, images) {
    images.forEach(function (img, idx) {
        var placeholder = "@@IMG" + idx + "@@";
        var nodes = collectTextNodes(element);
        nodes.forEach(function (node) {
            if (node.nodeValue.indexOf(placeholder) !== -1) {
                replacePlaceholderInTextNode(node, placeholder, function () {
                    var imgEl = document.createElement("img");
                    imgEl.className = "exercise-image";
                    imgEl.src = img.url;
                    imgEl.alt = img.alt;
                    return imgEl;
                });
            }
        });
    });
}

function parseLatexFragment(latex) {
    var extracted = extractImages(latex);
    var generator = new latexjs.HtmlGenerator({ hyphenate: false });
    generator = latexjs.parse(extracted.text, { generator: generator });
    ensureLatexjsStyles(generator);
    var frag = generator.domFragment();
    var div = document.createElement("div");
    div.className = "latexjs-body";
    while (frag.firstChild) {
        div.appendChild(frag.firstChild);
    }
    restoreImages(div, extracted.images);
    return div;
}

// Découpe un texte LaTeX en segments {type: "latex"|"multicols", ...}.
// Les blocs multicols sont isolés pour être rendus en colonnes CSS.
function splitMulticols(latex) {
    var segments = [];
    var re = /\\begin\{multicols\}\s*\{(\d+)\}([\s\S]*?)\\end\{multicols\}/g;
    var lastIndex = 0;
    var m;
    while ((m = re.exec(latex)) !== null) {
        if (m.index > lastIndex) {
            segments.push({ type: "latex", latex: latex.slice(lastIndex, m.index) });
        }
        segments.push({ type: "multicols", cols: m[1], latex: m[2] });
        lastIndex = m.index + m[0].length;
    }
    if (lastIndex < latex.length) {
        segments.push({ type: "latex", latex: latex.slice(lastIndex) });
    }
    return segments;
}

// Les \item hors itemize/enumerate ne sont pas valides pour latex.js :
// on encapsule le contenu de multicols dans un itemize si nécessaire.
function wrapLooseItems(content) {
    if (/\\item\b/.test(content) && !/\\begin\{(?:itemize|enumerate)\}/.test(content)) {
        return "\\begin{itemize}\n" + content + "\n\\end{itemize}";
    }
    return content;
}

// Convertit un texte LaTeX en élément DOM compilé (latex.js + KaTeX).
function latexToHtml(latex) {
    var container = document.createElement("div");
    splitMulticols(latex).forEach(function (seg) {
        if (seg.type === "multicols") {
            var cols = document.createElement("div");
            cols.className = "latex-multicols";
            cols.style.columnCount = seg.cols;
            cols.appendChild(parseLatexFragment(wrapLooseItems(seg.latex)));
            container.appendChild(cols);
        } else if (seg.latex.trim()) {
            container.appendChild(parseLatexFragment(seg.latex));
        }
    });
    return container;
}

// Version texte brut : commandes d'environnement retirées, \item en puce.
function latexToPlainText(latex) {
    return latex
        .replace(/\\begin\{multicols\}\s*\{(\d+)\}|\\begin\{(?:itemize|enumerate)\}|\\end\{(?:itemize|enumerate|multicols)\}/g, "")
        .replace(/\\item\b/g, "\u2022 ")
        .replace(LATEX_IMAGE_RE, "[image : $1] ($2)");
}

// Affiche un contenu LaTeX dans un élément : version compilée (latex.js)
// par défaut, texte brut via toggleLatexView. Repli texte brut si latex.js
// n'est pas chargé ou si le parse échoue (LaTeX non supporté).
function renderLatexContent(el, latex) {
    el.dataset.latex = latex;
    el.dataset.view = "compiled";
    el.innerHTML = "";
    var compiled = false;
    if (window.latexjs) {
        try {
            el.appendChild(latexToHtml(latex));
            compiled = true;
        } catch (err) {
            compiled = false;
        }
    }
    if (!compiled) {
        el.textContent = latex;
        renderMath(el);
    }
}

function toggleLatexView(el) {
    if (el.dataset.view === "compiled") {
        el.dataset.view = "raw";
        el.textContent = latexToPlainText(el.dataset.latex);
    } else {
        renderLatexContent(el, el.dataset.latex);
    }
}
