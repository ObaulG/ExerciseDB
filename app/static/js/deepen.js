// === Page Approfondir — génère des variantes d'un exercice existant ===

// Les constantes (TYPES_EXERCICE, NIVEAUX_SCOLAIRES, THEMES_DISPONIBLES), le rendu
// latex.js et la gestion d'image sont définis dans exercises-shared.js.

// === État ===

var sourceExercise = null;
var variations = [];
var selectedVariationIdx = -1;
var themes = [];
var exerciseImage = null;

// === Initialisation ===

document.addEventListener("DOMContentLoaded", function () {
    initSelects();
    initFormListeners();
    initThemesBlock();
    initActions();
    initImageInsert();
    loadSourceExercise();
});

// === Chargement de l'exercice source depuis l'URL ===

async function loadSourceExercise() {
    var params = new URLSearchParams(window.location.search);
    var exerciseId = params.get("exercise_id");

    if (!exerciseId) {
        document.getElementById("source-loading").style.display = "none";
        document.getElementById("source-empty").style.display = "";
        return;
    }

    try {
        var res = await fetch("/api/exercises/" + exerciseId);
        if (!res.ok) {
            throw new Error("Exercice introuvable");
        }
        var data = await res.json();
        sourceExercise = data;
        renderSource();
    } catch (err) {
        document.getElementById("source-loading").textContent =
            "Erreur : " + err.message;
    }
}

function renderSource() {
    document.getElementById("source-loading").style.display = "none";
    document.getElementById("source-content").style.display = "";

    document.getElementById("source-name").textContent = sourceExercise.name || "(sans titre)";

    var badges = [];
    if (sourceExercise.type) badges.push(sourceExercise.type);
    if (sourceExercise.niveau) badges.push(sourceExercise.niveau);
    if (sourceExercise.temps_estime) badges.push(sourceExercise.temps_estime + " min");
    (sourceExercise.themes || []).forEach(function (t) {
        badges.push(t);
    });
    document.getElementById("source-badges").innerHTML = badges.map(function (b) {
        return '<span class="source-badge">' + escapeHtml(b) + "</span>";
    }).join("");

    var textEl = document.getElementById("source-text");
    textEl.innerHTML = "";
    renderLatexContent(textEl, sourceExercise.text);
    appendExerciseImage(textEl, sourceExercise.image_url);
}

// === Sélecteurs Type / Niveau ===

function initSelects() {
    var selType = document.getElementById("f-type");
    selType.innerHTML = '<option value="">—</option>' +
        TYPES_EXERCICE.map(function (t) { return '<option value="' + t + '">' + t + "</option>"; }).join("");

    var selNiveau = document.getElementById("f-niveau");
    selNiveau.innerHTML = '<option value="">—</option>' +
        NIVEAUX_SCOLAIRES.map(function (n) { return '<option value="' + n + '">' + n + "</option>"; }).join("");
}

// === Écouteurs du formulaire (aperçu en direct) ===

function initFormListeners() {
    ["f-name", "f-text", "f-type", "f-niveau", "f-temps", "f-correction"].forEach(function (id) {
        document.getElementById(id).addEventListener("input", renderPreview);
        document.getElementById(id).addEventListener("change", renderPreview);
    });
}

// === Bloc thèmes ===

function initThemesBlock() {
    renderThemesBlock();
}

function renderThemesBlock() {
    var container = document.getElementById("themes-block");
    container.innerHTML = "";

    var tagsDiv = document.createElement("div");
    tagsDiv.className = "theme-tags";

    themes.forEach(function (theme, idx) {
        var tag = document.createElement("span");
        tag.className = "theme-tag";
        tag.textContent = theme;
        var rm = document.createElement("span");
        rm.className = "remove-tag";
        rm.textContent = "×";
        rm.addEventListener("click", function () {
            themes.splice(idx, 1);
            renderThemesBlock();
            renderPreview();
        });
        tag.appendChild(rm);
        tagsDiv.appendChild(tag);
    });

    container.appendChild(tagsDiv);

    var addDiv = document.createElement("div");
    addDiv.className = "theme-add";
    var sel = document.createElement("select");
    sel.innerHTML = '<option value="">+ Ajouter un thème…</option>' +
        THEMES_DISPONIBLES.filter(function (t) { return themes.indexOf(t) === -1; })
            .map(function (t) { return '<option value="' + t + '">' + t + "</option>"; }).join("");
    sel.addEventListener("change", function () {
        if (sel.value && themes.indexOf(sel.value) === -1) {
            themes.push(sel.value);
            renderThemesBlock();
            renderPreview();
        }
    });
    addDiv.appendChild(sel);
    container.appendChild(addDiv);
}

// === Image de l'exercice ===

function initImageInsert() {
    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png,image/jpeg,image/gif,image/webp,image/svg+xml";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);

    var btn = document.getElementById("f-image-btn");
    var removeBtn = document.getElementById("f-image-remove");
    var statusEl = document.getElementById("f-image-status");

    btn.addEventListener("click", function () {
        fileInput.value = "";
        fileInput.click();
    });

    removeBtn.addEventListener("click", function () {
        exerciseImage = null;
        updateImageUI();
        renderPreview();
    });

    fileInput.addEventListener("change", async function () {
        var file = fileInput.files[0];
        if (!file) return;
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
            exerciseImage = data.url;
            statusEl.textContent = "Image associée à l'exercice.";
            updateImageUI();
            renderPreview();
        } catch (err) {
            statusEl.textContent = "Erreur : " + err.message;
        }
    });

    updateImageUI();
}

function updateImageUI() {
    var removeBtn = document.getElementById("f-image-remove");
    var statusEl = document.getElementById("f-image-status");
    removeBtn.style.display = exerciseImage ? "" : "none";
    if (!exerciseImage && !statusEl.textContent.startsWith("Erreur")) {
        statusEl.textContent = "";
    }
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

// === Génération des variantes ===

function initActions() {
    document.getElementById("generate-btn").addEventListener("click", generateVariations);
    document.getElementById("clear-instruction-btn").addEventListener("click", function () {
        document.getElementById("variation-instruction").value = "";
        document.getElementById("variation-instruction").focus();
    });
    document.getElementById("save-btn").addEventListener("click", saveExercise);
    document.getElementById("reset-btn").addEventListener("click", resetForm);
}

async function generateVariations() {
    if (!sourceExercise) {
        setStatus("generate-status", "Aucun exercice source sélectionné.", true);
        return;
    }

    var instruction = document.getElementById("variation-instruction").value.trim();
    var btn = document.getElementById("generate-btn");

    btn.disabled = true;
    setStatus("generate-status", "L'IA réfléchit…");
    document.getElementById("variations-window").style.display = "none";

    var headers = { "Content-Type": "application/json" };
    var apiKey = localStorage.getItem("mistral_api_key") || "";
    if (apiKey) {
        headers["X-Mistral-API-Key"] = apiKey;
    }

    var payload = {
        exercise_id: sourceExercise.id,
        instruction: instruction,
    };

    try {
        var res = await fetch("/api/exercises/variations", {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            var err = await res.json().catch(function () { return { detail: "Erreur" }; });
            throw new Error(err.detail || "Erreur lors de la génération");
        }
        var data = await res.json();
        variations = data.variations || [];
        renderVariations();
        setStatus("generate-status", "Variantes prêtes. Clique sur une variante pour la sélectionner.");
    } catch (err) {
        setStatus("generate-status", "Erreur : " + err.message, true);
    } finally {
        btn.disabled = false;
    }
}

// === Affichage des variantes ===

function renderVariations() {
    var window = document.getElementById("variations-window");
    var list = document.getElementById("variations-list");
    list.innerHTML = "";

    if (!variations.length) {
        setStatus("generate-status", "Aucune variante générée.", true);
        return;
    }

    variations.forEach(function (v, idx) {
        var card = document.createElement("div");
        card.className = "variation-card";
        card.dataset.idx = String(idx);

        var header = document.createElement("div");
        header.className = "variation-header";

        var title = document.createElement("div");
        title.className = "variation-title";
        title.textContent = v.name || "(sans titre)";

        var badges = document.createElement("div");
        badges.className = "variation-badges";
        var badgeItems = [];
        if (v.type) badgeItems.push(v.type);
        if (v.niveau) badgeItems.push(v.niveau);
        if (v.temps_estime) badgeItems.push(v.temps_estime + " min");
        badges.innerHTML = badgeItems.map(function (b) {
            return '<span class="source-badge">' + escapeHtml(b) + "</span>";
        }).join("");

        header.appendChild(title);
        header.appendChild(badges);
        card.appendChild(header);

        if (v.summary) {
            var summary = document.createElement("div");
            summary.className = "variation-summary";
            summary.textContent = v.summary;
            card.appendChild(summary);
        }

        var themesRow = document.createElement("div");
        themesRow.className = "variation-themes";
        (v.themes || []).forEach(function (t) {
            var tag = document.createElement("span");
            tag.className = "theme-tag";
            tag.textContent = t;
            themesRow.appendChild(tag);
        });
        card.appendChild(themesRow);

        var preview = document.createElement("div");
        preview.className = "variation-preview";
        renderLatexContent(preview, v.text, "raw");
        appendExerciseImage(preview, v.image_url);
        card.appendChild(preview);

        var viewBtn = document.createElement("button");
        viewBtn.type = "button";
        viewBtn.className = "retro-btn latex-view-btn";
        viewBtn.textContent = "📄 LaTeX compilé";
        viewBtn.addEventListener("click", function () {
            toggleLatexView(preview);
            viewBtn.textContent = preview.dataset.view === "compiled"
                ? "📄 Texte brut"
                : "📄 LaTeX compilé";
        });
        card.appendChild(viewBtn);

        var selectBtn = document.createElement("button");
        selectBtn.type = "button";
        selectBtn.className = "retro-btn primary variation-select-btn";
        selectBtn.textContent = "✓ Choisir cette variante";
        selectBtn.addEventListener("click", function () {
            selectVariation(idx);
        });
        card.appendChild(selectBtn);

        list.appendChild(card);
    });

    window.style.display = "";
}

function selectVariation(idx) {
    if (idx < 0 || idx >= variations.length) return;
    selectedVariationIdx = idx;
    var v = variations[idx];

    // Remplir le formulaire
    document.getElementById("f-name").value = v.name || "";
    document.getElementById("f-text").value = v.text || "";
    document.getElementById("f-type").value = v.type || "";
    document.getElementById("f-niveau").value = v.niveau || "";
    document.getElementById("f-temps").value = v.temps_estime != null ? String(v.temps_estime) : "";
    themes = Array.isArray(v.themes) ? v.themes.slice() : [];
    exerciseImage = v.image_url || null;
    updateImageUI();

    var corrections = Array.isArray(v.corrections) ? v.corrections : [];
    document.getElementById("f-correction").value = corrections.join("\n\n");

    renderThemesBlock();
    renderPreview();

    // Afficher le formulaire et l'aperçu
    document.getElementById("form-window").style.display = "";
    document.getElementById("preview-window").style.display = "";

    // Marquer la variante sélectionnée
    document.querySelectorAll(".variation-card").forEach(function (card) {
        card.classList.remove("selected");
    });
    document.querySelector('.variation-card[data-idx="' + idx + '"]').classList.add("selected");

    // Scroll vers le formulaire
    document.getElementById("form-window").scrollIntoView({ behavior: "smooth" });
    setStatus("save-status", "Variante sélectionnée. Vérifie puis enregistre.");
}

// === Aperçu en direct ===

function renderPreview() {
    var text = document.getElementById("f-text").value;
    var correction = document.getElementById("f-correction").value;

    var previewText = document.getElementById("preview-text");
    var previewCorrection = document.getElementById("preview-correction");

    fillPreview(previewText, text, "Énoncé vide.");
    appendExerciseImage(previewText, exerciseImage);
    fillPreview(previewCorrection, correction, "Aucune correction saisie.", true);
}

function fillPreview(el, content, emptyMsg, isCorrection) {
    el.innerHTML = "";
    if (content.trim()) {
        el.classList.remove("empty");
        renderLatexContent(el, content);
    } else {
        el.classList.add("empty");
        el.textContent = emptyMsg;
    }
    if (isCorrection) {
        el.classList.add("correction");
    }
}

// === Enregistrement en base ===

function getFormState() {
    return {
        name: document.getElementById("f-name").value,
        text: document.getElementById("f-text").value,
        image_url: exerciseImage,
        type: document.getElementById("f-type").value,
        niveau: document.getElementById("f-niveau").value,
        temps_estime: document.getElementById("f-temps").value,
        themes: themes.slice(),
        corrections: (function () {
            var c = document.getElementById("f-correction").value.trim();
            return c ? [c] : [];
        })(),
    };
}

async function saveExercise() {
    var state = getFormState();
    var name = state.name.trim();
    var text = state.text.trim();

    if (!name) {
        setStatus("save-status", "Le titre est obligatoire.", true);
        return;
    }
    if (!text) {
        setStatus("save-status", "L'énoncé est obligatoire.", true);
        return;
    }

    var btn = document.getElementById("save-btn");
    btn.disabled = true;
    setStatus("save-status", "Enregistrement…");

    var payload = {
        name: name,
        text: text,
        image_url: state.image_url || null,
        type: state.type || null,
        niveau: state.niveau || null,
        temps_estime: state.temps_estime ? parseInt(state.temps_estime, 10) : null,
        themes: state.themes,
        corrections: state.corrections.map(function (c) { return { text: c }; }),
    };

    try {
        var res = await fetch("/api/exercises", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            var err = await res.json().catch(function () { return { detail: "Erreur" }; });
            throw new Error(err.detail || "Erreur lors de l'enregistrement");
        }
        var data = await res.json();
        setStatus("save-status", "Exercice #" + data.id + " enregistré.");
    } catch (err) {
        setStatus("save-status", "Erreur : " + err.message, true);
    } finally {
        btn.disabled = false;
    }
}

function resetForm() {
    if (!confirm("Réinitialiser le formulaire ? Les saisies en cours seront perdues.")) return;
    document.getElementById("f-name").value = "";
    document.getElementById("f-text").value = "";
    document.getElementById("f-type").value = "";
    document.getElementById("f-niveau").value = "";
    document.getElementById("f-temps").value = "";
    document.getElementById("f-correction").value = "";
    exerciseImage = null;
    updateImageUI();
    themes = [];
    renderThemesBlock();
    renderPreview();
    setStatus("save-status", "Formulaire réinitialisé.");
}

// === Utilitaires ===

function setStatus(id, msg, isError) {
    var el = document.getElementById(id);
    el.textContent = msg;
    el.style.color = isError ? "#990000" : "var(--bleu-fonce)";
}

function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}
