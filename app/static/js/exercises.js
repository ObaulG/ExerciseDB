// === Constantes ===

// Les constantes (TYPES_EXERCICE, NIVEAUX_SCOLAIRES, THEMES_DISPONIBLES) et
// renderMath() sont définies dans exercises-shared.js, chargé avant ce fichier.

// === État ===

let extractedExercises = []; // [{ enonce, titre, type, niveau, temps, themes: [], correction, image, selected }]


// === Initialisation ===

document.addEventListener("DOMContentLoaded", function () {
    initExtractUI();
    initCardsActions();
});

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

    extractWithLLM(raw, statusEl);
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
                image: "",
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

// === Image d'une carte d'exercice (au plus une, déclarée hors du code LaTeX) ===

var cardImageFileInput = null;

function ensureCardImageFileInput() {
    if (cardImageFileInput) return cardImageFileInput;
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/gif,image/webp,image/svg+xml";
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("change", async function () {
        var file = input.files[0];
        if (!file) return;
        var statusEl = input._targetStatus;
        statusEl.textContent = "Envoi de l'image…";
        try {
            var dataBase64 = await fileToBase64(file);
            var res = await fetch("/api/exercises/images", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename: file.name,
                    mime_type: file.type,
                    data_base64: dataBase64,
                }),
            });
            if (!res.ok) {
                var err = await res.json().catch(function () { return { detail: "Erreur" }; });
                throw new Error(err.detail || "Erreur lors de l'envoi de l'image");
            }
            var data = await res.json();
            input._onUploaded(data.url);
            statusEl.textContent = "Image associée.";
        } catch (err) {
            statusEl.textContent = "Erreur : " + err.message;
        }
    });
    cardImageFileInput = input;
    return input;
}

function buildCardImageRow(onChange) {
    var row = document.createElement("div");
    row.className = "image-insert-row";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "retro-btn image-insert-btn";
    btn.textContent = "🖼️ Choisir une image";
    var status = document.createElement("span");
    status.className = "inline-status image-status";
    status.style.fontSize = "11px";
    btn.addEventListener("click", function () {
        var input = ensureCardImageFileInput();
        input._onUploaded = onChange;
        input._targetStatus = status;
        input.value = "";
        input.click();
    });
    row.appendChild(btn);
    row.appendChild(status);
    return row;
}

function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
            resolve(String(reader.result).split(",")[1] || "");
        };
        reader.onerror = function () { reject(new Error("Lecture du fichier impossible")); };
        reader.readAsDataURL(file);
    });
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
    taEnonce.placeholder = "Énoncé de l'exercice, en LaTeX compilable par latex.js...";
    taEnonce.addEventListener("input", function () { extractedExercises[idx].enonce = taEnonce.value; });
    body.appendChild(taEnonce);

    var lblImage = document.createElement("label");
    lblImage.innerHTML = "Image <span class=\"opt\">(optionnelle, au plus une, hors du code LaTeX)</span>";
    body.appendChild(lblImage);
    var imageUrl = ex.image || null;
    body.appendChild(buildCardImageRow(function (url) { imageUrl = url; }));

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
    taCorrection.placeholder = "Texte du corrigé, en LaTeX compilable par latex.js...";
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
            themes: [], correction: "", image: "", selected: true,
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
                    image_url: imageUrl || null,
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
