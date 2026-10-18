// === Constantes ===

// Les constantes (TYPES_EXERCICE, NIVEAUX_SCOLAIRES, THEMES_DISPONIBLES) et
// renderMath() sont définies dans exercises-shared.js, chargé avant ce fichier.

// === État ===

let extractedExercises = []; // [{ enonce, titre, type, niveau, temps, themes: [], correction, selected }]
let currentMode = "parser"; // "parser" ou "agent"

// === Initialisation ===

document.addEventListener("DOMContentLoaded", function () {
    initModeTabs();
    initExtractUI();
    initCardsActions();
});

// === Onglets de mode (Parser / Agent LLM) ===

function initModeTabs() {
    var tabs = document.querySelectorAll(".mode-tab");
    tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            tabs.forEach(function (t) { t.classList.remove("active"); });
            tab.classList.add("active");
            currentMode = tab.dataset.mode;
            // Mettre à jour le libellé du bouton
            var btn = document.getElementById("extract-btn");
            if (btn) {
                btn.textContent = currentMode === "agent" ? "Extraire avec l'agent LLM" : "Extraire les exercices";
            }
        });
    });
}

// === Onglets d'extraction ===

function initExtractUI() {
    var tabs = document.querySelectorAll(".extract-tab");
    tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            tabs.forEach(function (t) { t.classList.remove("active"); });
            tab.classList.add("active");
            document.querySelectorAll(".extract-panel").forEach(function (p) {
                p.classList.remove("active");
            });
            document.getElementById("extract-" + tab.dataset.tab).classList.add("active");
        });
    });

    var fileDrop = document.getElementById("file-drop");
    var pdfFile = document.getElementById("pdf-file");

    fileDrop.addEventListener("click", function () { pdfFile.click(); });
    fileDrop.addEventListener("dragover", function (e) {
        e.preventDefault();
        fileDrop.classList.add("dragover");
    });
    fileDrop.addEventListener("dragleave", function () {
        fileDrop.classList.remove("dragover");
    });
    fileDrop.addEventListener("drop", function (e) {
        e.preventDefault();
        fileDrop.classList.remove("dragover");
        if (e.dataTransfer.files[0]) handlePDF(e.dataTransfer.files[0]);
    });
    pdfFile.addEventListener("change", function (e) {
        if (e.target.files[0]) handlePDF(e.target.files[0]);
    });

    document.getElementById("extract-btn").addEventListener("click", extractExercises);
}

// === Lecture PDF ===

async function handlePDF(file) {
    var statusEl = document.getElementById("pdf-status");
    statusEl.innerHTML = '<div>Lecture de <strong>' + file.name + '</strong>…</div>' +
                         '<div class="progress-bar"><div class="progress-bar-fill" id="pdf-progress"></div></div>';
    try {
        var buf = await file.arrayBuffer();
        var pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        var fullText = "";
        for (var i = 1; i <= pdf.numPages; i++) {
            var page = await pdf.getPage(i);
            var content = await page.getTextContent();
            var lastY = null;
            var pageText = "";
            for (var j = 0; j < content.items.length; j++) {
                var item = content.items[j];
                var y = item.transform[5];
                if (lastY !== null && Math.abs(y - lastY) > 2) {
                    pageText += "\n";
                } else if (pageText && !pageText.endsWith("\n")) {
                    pageText += " ";
                }
                pageText += item.str;
                lastY = y;
            }
            fullText += pageText + "\n\n";
            var pct = Math.round((i / pdf.numPages) * 100);
            document.getElementById("pdf-progress").style.width = pct + "%";
            statusEl.firstChild.textContent = "Lecture de " + file.name + "… page " + i + "/" + pdf.numPages;
        }
        document.getElementById("raw-text").value = fullText.trim();
        document.querySelectorAll(".extract-tab").forEach(function (t) { t.classList.remove("active"); });
        document.querySelector('.extract-tab[data-tab="text"]').classList.add("active");
        document.querySelectorAll(".extract-panel").forEach(function (p) { p.classList.remove("active"); });
        document.getElementById("extract-text").classList.add("active");
        statusEl.innerHTML = '<div>PDF lu : ' + pdf.numPages + ' page(s), ' + fullText.length + ' caractères. Cliquez sur « Extraire ».</div>';
    } catch (err) {
        statusEl.innerHTML = '<div>Erreur : ' + err.message + "</div>";
    }
}

// === Extraction des exercices ===

function extractExercises() {
    var raw = document.getElementById("raw-text").value.trim();
    var statusEl = document.getElementById("extract-status");
    statusEl.textContent = "";

    if (!raw) {
        statusEl.textContent = "Aucun texte à analyser.";
        return;
    }

    if (currentMode === "agent") {
        extractWithLLM(raw, statusEl);
    } else {
        extractWithParser(raw, statusEl);
    }
}

async function extractWithLLM(raw, statusEl) {
    var btn = document.getElementById("extract-btn");
    btn.disabled = true;
    statusEl.textContent = "Extraction en cours (agent LLM)…";

    var headers = { "Content-Type": "application/json" };
    var apiKey = localStorage.getItem("mistral_api_key") || "";
    if (apiKey) {
        headers["X-Mistral-API-Key"] = apiKey;
    }

    try {
        var res = await fetch("/api/exercises/extract", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ raw_text: raw }),
        });

        if (!res.ok) {
            var err = await res.json().catch(function () { return { detail: "Erreur" }; });
            throw new Error(err.detail || "Erreur lors de l'extraction");
        }

        var data = await res.json();
        var items = data.exercises || [];

        if (items.length === 0) {
            statusEl.textContent = "Aucun exercice identifié par l'agent.";
            btn.disabled = false;
            return;
        }

        extractedExercises = items.map(function (item) {
            return {
                enonce: item.enonce || "",
                titre: item.titre || "",
                type: item.type || "",
                niveau: item.niveau || "",
                temps: item.temps ? String(item.temps) : "",
                themes: item.themes || [],
                correction: item.correction || "",
                selected: true,
            };
        });

        renderCards();
        statusEl.textContent = extractedExercises.length + " exercice(s) extrait(s) par l'agent.";
    } catch (err) {
        statusEl.textContent = "Erreur : " + err.message;
    }

    btn.disabled = false;
}

function extractWithParser(raw, statusEl) {
    var parsed = parseLatexExercises(raw);

    if (parsed.length === 0) {
        statusEl.textContent = "Aucun environnement Exercise détecté. Vérifiez que votre LaTeX utilise \\begin{Exercise}...\\end{Exercise}.";
        return;
    }

    // Préserve les champs édités manuellement quand l'indice existe déjà.
    extractedExercises = parsed.map(function (item, i) {
        var existing = extractedExercises[i];
        if (!existing) return item;
        return {
            enonce: item.enonce,
            titre: item.titre || existing.titre,
            type: item.type || existing.type,
            niveau: item.niveau || existing.niveau,
            temps: item.temps || existing.temps,
            themes: item.themes.length ? item.themes : existing.themes.slice(),
            correction: item.correction || existing.correction,
            selected: true,
        };
    });

    renderCards();
    statusEl.textContent = extractedExercises.length + " exercice(s) extrait(s).";
}

// === Parser LaTeX — package exercise (environnements Exercise / Answer) ===

function parseLatexExercises(text) {
    var exercises = [];

    // Détecte \begin{Exercise}[titre optionnel] ... \end{Exercise}
    var envRe = /\\begin\s*\{Exercise\}\s*(\[[^\]]*\])?/g;
    var match;

    while ((match = envRe.exec(text)) !== null) {
        var optionalArg = match[1] || "";
        var contentStart = match.index + match[0].length;

        // Trouve le \end{Exercise} correspondant (gère l'imbrication)
        var contentEnd = findLatexEnvironmentEnd(text, contentStart, "Exercise");
        if (contentEnd === -1) continue;

        var body = text.slice(contentStart, contentEnd);

        // Titre depuis l'argument optionnel [titre]
        var titre = "";
        if (optionalArg) {
            titre = optionalArg.replace(/^\[|\]$/g, "").trim();
        }

        // Extrait la correction depuis l'environnement Answer imbriqué
        var correction = extractLatexAnswer(body);

        // Nettoie le corps : retire les blocs Answer
        var enonce = stripLatexAnswers(body).trim();

        // Si pas de titre dans l'argument optionnel, essaie de le deviner
        if (!titre) {
            titre = extractTitle(enonce);
        }

        exercises.push({
            enonce: enonce,
            titre: titre,
            type: guessType(enonce),
            niveau: guessNiveau(enonce),
            temps: "",
            themes: guessThemes(enonce),
            correction: correction,
            selected: true,
            _start: match.index,
            _end: contentEnd + "\\end{Exercise}".length,
        });

        envRe.lastIndex = contentEnd + "\\end{Exercise}".length;
    }

    // Associe les environnements Answer orphelins (hors d'un Exercise)
    // au dernier Exercise précédent — c'est le mode answerdelayed du package.
    var ansRe = /\\begin\s*\{Answer\}\s*(\[[^\]]*\])?/g;
    while ((match = ansRe.exec(text)) !== null) {
        var ansContentStart = match.index + match[0].length;
        var ansContentEnd = findLatexEnvironmentEnd(text, ansContentStart, "Answer");
        if (ansContentEnd === -1) continue;

        // Vérifie si cet Answer est déjà dans un Exercise (imbriqué)
        var insideExercise = exercises.some(function (ex) {
            return match.index >= ex._start && match.index < ex._end;
        });
        if (insideExercise) continue;

        // Associe au dernier Exercise précédent
        var target = null;
        for (var i = exercises.length - 1; i >= 0; i--) {
            if (exercises[i]._end <= match.index) {
                target = exercises[i];
                break;
            }
        }
        if (target) {
            var ansBody = text.slice(ansContentStart, ansContentEnd).trim();
            if (target.correction) {
                target.correction += "\n\n" + ansBody;
            } else {
                target.correction = ansBody;
            }
        }

        ansRe.lastIndex = ansContentEnd + "\\end{Answer}".length;
    }

    // Nettoie les champs internes de positionnement
    exercises.forEach(function (ex) {
        delete ex._start;
        delete ex._end;
    });

    return exercises;
}

function findLatexEnvironmentEnd(text, start, envName) {
    var openTag = "\\begin{" + envName + "}";
    var closeTag = "\\end{" + envName + "}";
    var depth = 1;
    var pos = start;

    while (pos < text.length) {
        var nextOpen = text.indexOf(openTag, pos);
        var nextClose = text.indexOf(closeTag, pos);

        if (nextClose === -1) return -1;

        if (nextOpen !== -1 && nextOpen < nextClose) {
            depth++;
            pos = nextOpen + openTag.length;
        } else {
            depth--;
            if (depth === 0) return nextClose;
            pos = nextClose + closeTag.length;
        }
    }
    return -1;
}

function extractLatexAnswer(body) {
    var correction = "";

    // \begin{Answer}[optionnel] ... \end{Answer}
    var ansRe = /\\begin\s*\{Answer\}\s*(\[[^\]]*\])?/g;
    var match;
    while ((match = ansRe.exec(body)) !== null) {
        var contentStart = match.index + match[0].length;
        var contentEnd = findLatexEnvironmentEnd(body, contentStart, "Answer");
        if (contentEnd === -1) continue;
        if (correction) correction += "\n\n";
        correction += body.slice(contentStart, contentEnd).trim();
    }

    return correction.trim();
}

function stripLatexAnswers(body) {
    var out = body;

    // Retire \begin{Answer}...\end{Answer}
    var ansRe = /\\begin\s*\{Answer\}\s*(\[[^\]]*\])?/g;
    var match;
    while ((match = ansRe.exec(out)) !== null) {
        var contentStart = match.index + match[0].length;
        var contentEnd = findLatexEnvironmentEnd(out, contentStart, "Answer");
        if (contentEnd === -1) continue;
        out = out.slice(0, match.index) + out.slice(contentEnd + "\\end{Answer}".length);
        ansRe.lastIndex = match.index;
    }

    return out;
}

// === Devinettes automatiques ===

function extractTitle(text) {
    var m = text.match(/^(?:Exercice|Ex\.?|Exo\.?)\s*\d+\s*[:..\-—]\s*(.+)$/im);
    if (m && m[1].trim().length > 3 && m[1].trim().length < 100) {
        return m[1].trim();
    }
    return "";
}

function guessType(text) {
    var lower = text.toLowerCase();
    if (/d[ée]montr|prouv|montrer\s+que/.test(lower)) return "Démonstration";
    if (/probl[èe]me/.test(lower)) return "Problème";
    if (/recherch|investig|explor/.test(lower)) return "Recherche";
    if (/calcul(er)?\s+|effectu|comput/.test(lower) && text.length < 200) return "Application directe";
    return "Exercice normal";
}

function guessNiveau(text) {
    var lower = text.toLowerCase();
    var explicit = [
        [/\bcp\b/, "CP"], [/\bce1\b/, "CE1"], [/\bce2\b/, "CE2"],
        [/\bcm1\b/, "CM1"], [/\bcm2\b/, "CM2"],
        [/\b6e\b|sixi[èe]me/, "6e"], [/\b5e\b|cinqui[èe]me/, "5e"],
        [/\b4e\b|quatri[èe]me/, "4e"], [/\b3e\b|troisi[èe]me/, "3e"],
        [/\b2nde\b|seconde/, "2nde"], [/\b1[èe]re\b|premi[èe]re/, "1ère"],
        [/\bterminale\b/, "Terminale"],
    ];
    for (var i = 0; i < explicit.length; i++) {
        if (explicit[i][0].test(lower)) return explicit[i][1];
    }
    if (/int[ée]grale|primitive|d[ée]riv[ée]e|suite\s+r[ée]currente|r[ée]currence|matrice|espace\s+vectoriel/.test(lower)) return "Terminale";
    if (/d[ée]riv[ée]e|limite\s+de\s+fonction|nombre\s+d[ée]riv[ée]|fonction\s+exponentielle|fonction\s+logarithme/.test(lower)) return "1ère";
    if (/fonction|second\s+degr[ée]|polyn[ôo]me|vecteur|rep[èe]re\s+orthonorm[ée]|syst[èe]me\s+d'[ée]quation/.test(lower)) return "2nde";
    if (/th[ée]or[èe]me\s+de\s+pythagore|r[ée]ciproque|racine\s+carr[ée]|[ée]quation\s+produit|factorisation|identit[ée]\s+remarquable|trigonom[ée]trie/.test(lower)) return "3e";
    if (/th[ée]or[èe]me\s+de\s+thal[èe]s|puissance|notion\s+de\s+fonction|probabilit[ée]|pythagore/.test(lower)) return "4e";
    if (/proportionnalit[ée]|pourcentage|[ée]chelle|calcul\s+litt[ée]ral\s+simple|relatif|fraction\s+op[ée]ration/.test(lower)) return "5e";
    if (/fraction\s+simple|d[ée]cimal|op[ée]ration\s+[ée]l[ée]mentaire|p[ée]rim[èe]tre|aire\s+rectangle|droite\s+parall[èe]le/.test(lower)) return "6e";
    return "";
}

function guessThemes(text) {
    var lower = text.toLowerCase();
    var themes = [];
    var rules = [
        [/fraction|\\frac|num[ée]rateur|d[ée]nominateur/, "Fractions"],
        [/triangle|cercle|angle|polygone|parall[èe]l|perpendiculair|aire|p[ée]rim[èe]tre/, "Géométrie"],
        [/pythagore/, "Théorème de Pythagore"],
        [/thal[èe]s/, "Théorème de Thalès"],
        [/probabilit|loi\s+(de|binomiale|uniforme)|[ée]v[èe]nement|d[ée]\s+lanc|pi[èe]ce/, "Probabilités"],
        [/fonction|\\f\(|courbe|repr[ée]sentation\s+graphique/, "Fonctions"],
        [/[ée]quation|in[ée]quation|r[ée]soudre|x\s*=|inconnue/, "Équations et inéquations"],
        [/suite|u_n|r[ée]currence|raison/, "Suites"],
        [/sin|cos|tan|radian/, "Trigonométrie"],
        [/vecteur|\\vec/, "Vecteurs"],
        [/d[ée]riv[ée]|f'\(|tangente\s+[àa]\s+la\s+courbe/, "Dérivation"],
        [/int[ée]grale|primitive|\\int/, "Intégrales"],
        [/d[ée]cimal|virgule/, "Nombres décimaux"],
        [/proportionnal|tableau|[ée]chelle|pourcentage/, "Proportionnalité"],
        [/statistique|moyenne|m[ée]diane|[ée]tendue|effectif/, "Statistiques"],
        [/relatif|n[ée]gatif|oppos[ée]/, "Nombres relatifs"],
        [/puissance|exposant|10\^/, "Puissances"],
        [/racine\s+carr[ée]|\\sqrt/, "Racines carrées"],
        [/litt[ée]ral|d[ée]velopper|factoriser|identit[ée]\s+remarquable/, "Calcul littéral"],
        [/logique|raisonnement|implique|si\s+et\s+seulement\s+si|contrapos[ée]e|r[ée]ciproque/, "Logique et raisonnement"],
        [/\+\s*\d|-\s*\d|\d\s*[+\-]\s*\d|op[ée]ration/, "Calcul — opérations élémentaires"],
    ];
    rules.forEach(function (rule) {
        if (rule[0].test(lower)) themes.push(rule[1]);
    });
    return themes.filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 3);
}

// === Rendu des cartes ===

function renderCards() {
    var container = document.getElementById("cards-container");
    var empty = document.getElementById("empty-state");
    container.innerHTML = "";

    document.getElementById("extracted-count").textContent = extractedExercises.length;
    updateSelectedCount();

    if (extractedExercises.length === 0) {
        empty.style.display = "block";
        return;
    }
    empty.style.display = "none";

    extractedExercises.forEach(function (ex, idx) {
        container.appendChild(buildCard(ex, idx));
    });
}

function buildCard(ex, idx) {
    var card = document.createElement("div");
    card.className = "ex-card" + (ex.selected ? "" : " unselected");

    // --- Header : checkbox + numéro + supprimer ---
    var header = document.createElement("div");
    header.className = "ex-card-header";

    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = ex.selected;
    checkbox.addEventListener("change", function () {
        extractedExercises[idx].selected = checkbox.checked;
        card.classList.toggle("unselected", !checkbox.checked);
        updateSelectedCount();
    });
    header.appendChild(checkbox);

    var num = document.createElement("span");
    num.className = "ex-num";
    num.textContent = "Exercice " + (idx + 1);
    header.appendChild(num);

    var delBtn = document.createElement("button");
    delBtn.className = "ex-delete";
    delBtn.textContent = "×";
    delBtn.title = "Supprimer cet exercice";
    delBtn.addEventListener("click", function () {
        extractedExercises.splice(idx, 1);
        renderCards();
    });
    header.appendChild(delBtn);

    card.appendChild(header);

    // --- Body ---
    var body = document.createElement("div");
    body.className = "ex-card-body";

    // Énoncé
    var lblEnonce = document.createElement("label");
    lblEnonce.textContent = "Énoncé";
    body.appendChild(lblEnonce);

    var taEnonce = document.createElement("textarea");
    taEnonce.rows = 3;
    taEnonce.value = ex.enonce;
    taEnonce.placeholder = "Énoncé de l'exercice (LaTeX autorisé)...";
    taEnonce.addEventListener("input", function () { extractedExercises[idx].enonce = taEnonce.value; });
    body.appendChild(taEnonce);

    // Titre
    var lblTitre = document.createElement("label");
    lblTitre.innerHTML = "Titre <span class=\"opt\">(optionnel)</span>";
    body.appendChild(lblTitre);

    var inpTitre = document.createElement("input");
    inpTitre.type = "text";
    inpTitre.value = ex.titre || "";
    inpTitre.placeholder = "—";
    inpTitre.addEventListener("input", function () { extractedExercises[idx].titre = inpTitre.value; });
    body.appendChild(inpTitre);

    // Ligne : Type + Niveau + Temps
    var row = document.createElement("div");
    row.className = "ex-card-row";

    // Type
    var fieldType = document.createElement("div");
    fieldType.className = "ex-card-field";
    var lblType = document.createElement("label");
    lblType.textContent = "Type";
    fieldType.appendChild(lblType);
    var selType = document.createElement("select");
    selType.innerHTML = '<option value="">—</option>' +
        TYPES_EXERCICE.map(function (t) {
            return '<option value="' + t + '"' + (ex.type === t ? " selected" : "") + ">" + t + "</option>";
        }).join("");
    selType.addEventListener("change", function () { extractedExercises[idx].type = selType.value; });
    fieldType.appendChild(selType);
    row.appendChild(fieldType);

    // Niveau
    var fieldNiveau = document.createElement("div");
    fieldNiveau.className = "ex-card-field";
    var lblNiveau = document.createElement("label");
    lblNiveau.textContent = "Niveau";
    fieldNiveau.appendChild(lblNiveau);
    var selNiveau = document.createElement("select");
    selNiveau.innerHTML = '<option value="">—</option>' +
        NIVEAUX_SCOLAIRES.map(function (n) {
            return '<option value="' + n + '"' + (ex.niveau === n ? " selected" : "") + ">" + n + "</option>";
        }).join("");
    selNiveau.addEventListener("change", function () { extractedExercises[idx].niveau = selNiveau.value; });
    fieldNiveau.appendChild(selNiveau);
    row.appendChild(fieldNiveau);

    // Temps
    var fieldTemps = document.createElement("div");
    fieldTemps.className = "ex-card-field";
    var lblTemps = document.createElement("label");
    lblTemps.innerHTML = "Temps <span class=\"opt\">(min)</span>";
    fieldTemps.appendChild(lblTemps);
    var inpTemps = document.createElement("input");
    inpTemps.type = "number";
    inpTemps.min = "0";
    inpTemps.value = ex.temps || "";
    inpTemps.placeholder = "—";
    inpTemps.addEventListener("input", function () { extractedExercises[idx].temps = inpTemps.value; });
    fieldTemps.appendChild(inpTemps);
    row.appendChild(fieldTemps);

    body.appendChild(row);

    // Thèmes
    var lblThemes = document.createElement("label");
    lblThemes.textContent = "Thèmes";
    body.appendChild(lblThemes);
    body.appendChild(buildThemesBlock(ex, idx));

    // Correction
    var lblCorrection = document.createElement("label");
    lblCorrection.innerHTML = "Correction <span class=\"opt\">(optionnel)</span>";
    body.appendChild(lblCorrection);

    var taCorrection = document.createElement("textarea");
    taCorrection.rows = 3;
    taCorrection.value = ex.correction || "";
    taCorrection.placeholder = "Texte du corrigé (LaTeX autorisé)...";
    taCorrection.addEventListener("input", function () { extractedExercises[idx].correction = taCorrection.value; });
    body.appendChild(taCorrection);

    card.appendChild(body);
    return card;
}

function buildThemesBlock(ex, idx) {
    var container = document.createElement("div");

    var tagsDiv = document.createElement("div");
    tagsDiv.className = "theme-tags";

    ex.themes.forEach(function (theme, tIdx) {
        var tag = document.createElement("span");
        tag.className = "theme-tag";
        tag.textContent = theme;
        var rm = document.createElement("span");
        rm.className = "remove-tag";
        rm.textContent = "×";
        rm.addEventListener("click", function () {
            extractedExercises[idx].themes.splice(tIdx, 1);
            renderCards();
        });
        tag.appendChild(rm);
        tagsDiv.appendChild(tag);
    });

    container.appendChild(tagsDiv);

    var addDiv = document.createElement("div");
    addDiv.className = "theme-add";
    var sel = document.createElement("select");
    sel.innerHTML = '<option value="">+ Ajouter un thème…</option>' +
        THEMES_DISPONIBLES.filter(function (t) { return ex.themes.indexOf(t) === -1; })
            .map(function (t) { return '<option value="' + t + '">' + t + "</option>"; }).join("");
    sel.addEventListener("change", function () {
        if (sel.value && ex.themes.indexOf(sel.value) === -1) {
            ex.themes.push(sel.value);
            renderCards();
        }
    });
    addDiv.appendChild(sel);
    container.appendChild(addDiv);

    return container;
}

function updateSelectedCount() {
    var count = extractedExercises.filter(function (e) { return e.selected; }).length;
    document.getElementById("selected-count").textContent = count;
}

// === Actions des cartes ===

function initCardsActions() {
    document.getElementById("add-card-btn").addEventListener("click", function () {
        extractedExercises.push({
            enonce: "", titre: "", type: "", niveau: "", temps: "",
            themes: [], correction: "", selected: true,
        });
        renderCards();
    });

    document.getElementById("select-all-btn").addEventListener("click", function () {
        extractedExercises.forEach(function (e) { e.selected = true; });
        renderCards();
    });

    document.getElementById("deselect-all-btn").addEventListener("click", function () {
        extractedExercises.forEach(function (e) { e.selected = false; });
        renderCards();
    });

    document.getElementById("clear-cards-btn").addEventListener("click", function () {
        extractedExercises = [];
        renderCards();
    });

    document.getElementById("save-all-btn").addEventListener("click", saveSelectedExercises);
}

async function saveSelectedExercises() {
    var statusEl = document.getElementById("save-status");
    var countEl = document.getElementById("saved-count");
    var btn = document.getElementById("save-all-btn");

    var selected = extractedExercises.filter(function (e) { return e.selected && e.enonce.trim(); });

    if (selected.length === 0) {
        statusEl.textContent = "Aucun exercice sélectionné à enregistrer.";
        return;
    }

    btn.disabled = true;
    statusEl.textContent = "Enregistrement…";
    var saved = 0;
    var errors = 0;

    for (var i = 0; i < selected.length; i++) {
        var ex = selected[i];
        var name = ex.titre.trim() || ("Exercice " + (extractedExercises.indexOf(ex) + 1));
        var corrections = [];
        if (ex.correction.trim()) {
            corrections.push({ text: ex.correction.trim() });
        }
        try {
            var res = await fetch("/api/exercises", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name,
                    text: ex.enonce.trim(),
                    type: ex.type || null,
                    niveau: ex.niveau || null,
                    temps_estime: ex.temps ? parseInt(ex.temps, 10) : null,
                    themes: ex.themes,
                    corrections: corrections,
                }),
            });
            if (res.ok) {
                saved++;
            } else {
                errors++;
            }
        } catch (e) {
            errors++;
        }
    }

    btn.disabled = false;
    statusEl.textContent = errors > 0
        ? "Terminé avec " + errors + " erreur(s)."
        : "Terminé.";
    countEl.textContent = saved + " enregistré(s)";
}
