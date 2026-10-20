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

var LATEXJS_UNSUPPORTED_ENVS = [
    "exercise", "answer", "solution", "ex", "exo", "exercice",
    "question", "questions", "reponse", "reponses",
    "figure", "table", "minipage",
];

// Les environnements inconnus de latex.js (package exercise, figures)
// sont deballes en conservant leur contenu.
function unwrapUnsupportedEnvironments(latex) {
    var text = latex;
    LATEXJS_UNSUPPORTED_ENVS.forEach(function (env) {
        var beginRe = new RegExp("\\\\begin\\{" + env + "\\}(\\\\\\[[^\\]]*\\])?(\\{[^{}]*\\})?", "gi");
        text = text.replace(beginRe, "");
        var endRe = new RegExp("\\\\end\\{" + env + "\\}", "gi");
        text = text.replace(endRe, "\n");
    });
    return text;
}

var LATEXJS_RAW_ENVS = ["tikzpicture", "pspicture", "tabular", "tabular*", "verbatim", "lstlisting", "array"];

// Les environnements dont le contenu n'est pas du LaTeX compilable
// (figures, tableaux, code) sont extraits et restitues en blocs bruts.
function extractRawEnvironments(latex) {
    var blocks = [];
    var text = latex;
    LATEXJS_RAW_ENVS.forEach(function (env) {
        var escaped = env.replace("*", "\\*");
        var re = new RegExp("\\\\begin\\{" + escaped + "\\}(\\s*\\{[^{}]*\\})?([\\s\\S]*?)\\\\end\\{" + escaped + "\\}", "g");
        text = text.replace(re, function (m, opts, body) {
            blocks.push(body);
            return "@@ENV" + (blocks.length - 1) + "@@";
        });
    });
    return { text: text, blocks: blocks };
}

function restoreRawBlocks(element, blocks) {
    blocks.forEach(function (body, idx) {
        var placeholder = "@@ENV" + idx + "@@";
        var nodes = collectTextNodes(element);
        nodes.forEach(function (node) {
            if (node.nodeValue.indexOf(placeholder) !== -1) {
                replacePlaceholderInTextNode(node, placeholder, function () {
                    var pre = document.createElement("pre");
                    pre.className = "latex-raw-env";
                    pre.textContent = body.trim();
                    return pre;
                });
            }
        });
    });
}

var LATEXJS_MATH_ENVS = {
    "align*": "aligned", align: "aligned",
    "gather*": "gathered", gather: "gathered",
    "equation*": "", equation: "",
    "multline*": "", multline: "",
};

// Les environnements d'alignement ne sont pas connus de latex.js : on les
// reecrit en mathematiques en affichage \[ ... \], `aligned`/`gathered`
// etant supportes a l'interieur.
function convertMathEnvironments(latex) {
    var text = latex;
    Object.keys(LATEXJS_MATH_ENVS).forEach(function (env) {
        var escaped = env.replace("*", "\\*");
        var re = new RegExp("\\\\begin\\{" + escaped + "\\}([\\s\\S]*?)\\\\end\\{" + escaped + "\\}", "g");
        var inner = LATEXJS_MATH_ENVS[env];
        text = text.replace(re, function (m, body) {
            if (inner) {
                return "\\[\\begin{" + inner + "}" + body + "\\end{" + inner + "}\\]";
            }
            return "\\[" + body + "\\]";
        });
    });
    return text;
}

function stripUnsupportedPreamble(latex) {
    var text = latex;
    text = text.replace(/\\usepackage(\[[^\]]*\])?\s*\{[^{}]*\}/g, "");
    text = text.replace(/\\includegraphics(\[[^\]]*\])?\s*\{[^{}]*\}/g, "");
    text = text.replace(/\\footnote\s*\{([^{}]*)\}/g, " ($1)");
    text = text.replace(/\\maketitle/g, "");
    text = text.replace(/\\(?:title|author|date)\s*\{[^{}]*\}/g, "");
    return text;
}

function parseLatexFragment(latex) {
    var raw = extractRawEnvironments(latex);
    var prepared = stripUnsupportedPreamble(convertMathEnvironments(unwrapUnsupportedEnvironments(raw.text)));
    var extracted = extractImages(prepared);
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
    restoreRawBlocks(div, raw.blocks);
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
    if (!/\\item\b/.test(content) || /\\begin\{(?:itemize|enumerate)\}/.test(content)) {
        return content;
    }
    var m = /\\item\b/.exec(content);
    var head = content.slice(0, m.index);
    var items = content.slice(m.index);
    return head + "\n\\begin{itemize}\n" + items + "\n\\end{itemize}";
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
            container.appendChild(parseLatexFragment(wrapLooseItems(seg.latex)));
        }
    });
    return container;
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
            // Repli : texte source avec les mathematiques rendues via KaTeX,
            // avec un bandeau visible expliquant l'echec de la compilation.
            el.textContent = latex;
            renderMath(el);
            var notice = document.createElement("div");
            notice.className = "latex-fallback-notice";
            notice.textContent = "\u26a0\ufe0f Compilation LaTeX impossible : "
                + (err && err.message ? err.message : "erreur inconnue")
                + " \u2014 affichage du texte source.";
            el.insertBefore(notice, el.firstChild);
            el.dataset.view = "compiled";
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
