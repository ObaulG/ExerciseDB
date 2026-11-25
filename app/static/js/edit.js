// === Page Modifier : sélection d'un exercice existant et édition en direct ===
// Les constantes (TYPES_EXERCICE, NIVEAUX_SCOLAIRES, THEMES_DISPONIBLES), le rendu
// latex.js et la gestion d'image sont définis dans exercises-shared.js.

// === État ===

let exercises = [];        // liste complète des exercices (GET /api/exercises)
let currentId = null;      // id de l'exercice en cours d'édition
let themes = [];
let exerciseImage = null;
let dirty = false;

// === Initialisation ===

document.addEventListener("DOMContentLoaded", function () {
    initSelects();
    initFormListeners();
    initSelector();
    initActions();
    initImageInsert();
    renderPreview();
});

// === Sélecteurs Type / Niveau ===

function initSelects() {
    var selType = document.getElementById("f-type");
    selType.innerHTML = '<option value="">—</option>' +
        TYPES_EXERCICE.map(function (t) { return '<option value="' + t + '">' + t + "</option>"; }).join("");

    var selNiveau = document.getElementById("f-niveau");
    selNiveau.innerHTML = '<option value="">—</option>' +
        NIVEAUX_SCOLAIRES.map(function (n) { return '<option value="' + n + '">' + n + "</option>"; }).join("");
}

// === Sélecteur d'exercice ===

function initSelector() {
    var select = document.getElementById("exercise-select");
    select.addEventListener("change", function () {
        var id = parseInt(select.value, 10);
        if (!id) return;
        if (dirty && !confirm("Des modifications non enregistrées seront perdues. Charger l'exercice #" + id + " ?")) {
            select.value = currentId ? String(currentId) : "";
            return;
        }
        loadExercise(id);
    });
    refreshExerciseList();
}

async function refreshExerciseList() {
    var select = document.getElementById("exercise-select");
    var statusEl = document.getElementById("select-status");
    select.innerHTML = '<option value="">Chargement…</option>';
    try {
        var res = await fetch("/api/exercises");
        if (!res.ok) throw new Error("Erreur HTTP " + res.status);
        exercises = await res.json();
        select.innerHTML = '<option value="">— choisir un exercice —</option>' +
            exercises.map(function (ex) {
                return '<option value="' + ex.id + '">#' + ex.id + " — " + escapeHtml(ex.name) + "</option>";
            }).join("");
        if (currentId && exercises.some(function (ex) { return ex.id === currentId; })) {
            select.value = String(currentId);
        }
        statusEl.textContent = exercises.length + " exercice(s) disponible(s).";
    } catch (err) {
        select.innerHTML = '<option value="">Erreur de chargement</option>';
        statusEl.textContent = "Erreur : " + err.message;
        statusEl.style.color = "#990000";
    }
}

function escapeHtml(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// === Chargement d'un exercice dans le formulaire ===

async function loadExercise(id) {
    setStatus("save-status", "");
    var statusEl = document.getElementById("select-status");
    statusEl.textContent = "Chargement de l'exercice #" + id + "…";
    try {
        var res = await fetch("/api/exercises/" + id);
        if (!res.ok) {
            var err = await res.json().catch(function () { return { detail: "Erreur" }; });
            throw new Error(err.detail || "Erreur HTTP " + res.status);
        }
        var exercise = await res.json();
        currentId = exercise.id;
        applyState(exercise);
        dirty = false;
        statusEl.textContent = "Exercice #" + exercise.id + " chargé.";
        updateFormEnabled(true);
    } catch (err) {
        statusEl.textContent = "Erreur : " + err.message;
        statusEl.style.color = "#990000";
    }
}

function applyState(exercise) {
    document.getElementById("f-name").value = exercise.name || "";
    document.getElementById("f-text").value = exercise.text || "";
    document.getElementById("f-type").value = exercise.type || "";
    document.getElementById("f-niveau").value = exercise.niveau || "";
    document.getElementById("f-temps").value = exercise.temps_estime != null ? String(exercise.temps_estime) : "";
    themes = Array.isArray(exercise.themes) ? exercise.themes.slice() : [];
    exerciseImage = exercise.image_url || null;
    var corrections = (exercise.corrections || []).map(function (c) { return c.text; });
    document.getElementById("f-correction").value = corrections.join("\n\n");
    updateImageUI();
    renderThemesBlock();

    var badge = document.getElementById("editing-badge");
    badge.textContent = "#" + exercise.id + " — " + (exercise.name || "sans titre");
    badge.style.display = "inline";

    renderPreview();
}

function updateFormEnabled(enabled) {
    ["f-name", "f-text", "f-type", "f-niveau", "f-temps", "f-correction", "f-image-btn", "save-btn", "reset-btn"]
        .forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.disabled = !enabled;
        });
}

// === Écouteurs du formulaire (aperçu en direct + suivi des modifications) ===

function initFormListeners() {
    ["f-name", "f-text", "f-type", "f-niveau", "f-temps", "f-correction"].forEach(function (id) {
        var el = document.getElementById(id);
        el.addEventListener("input", onFormInput);
        el.addEventListener("change", onFormInput);
    });
}

function onFormInput() {
    dirty = true;
    renderPreview();
}

// === Bloc thèmes ===

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
            dirty = true;
            renderThemesBlock();
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
            dirty = true;
            renderThemesBlock();
        }
    });
    addDiv.appendChild(sel);
    container.appendChild(addDiv);
}

// === Aperçu en direct (compilation latex.js) ===

function renderPreview() {
    var text = document.getElementById("f-text").value;
    var correction = document.getElementById("f-correction").value;

    var previewText = document.getElementById("preview-text");
    var previewCorrection = document.getElementById("preview-correction");

    fillPreview(previewText, text, "Aucun exercice chargé — sélectionne un exercice.", "latex-status-text");
    fillPreview(previewCorrection, correction, "Aucun corrigé chargé.", "latex-status-correction", true);

    var imageSection = document.getElementById("image-preview-section");
    var imageContainer = document.getElementById("preview-image");
    imageContainer.innerHTML = "";
    if (exerciseImage) {
        var img = document.createElement("img");
        img.className = "exercise-image";
        img.src = exerciseImage;
        img.alt = "Image de l'exercice";
        imageContainer.appendChild(img);
        imageSection.style.display = "";
    } else {
        imageSection.style.display = "none";
    }
}

function fillPreview(el, content, emptyMsg, statusId, isCorrection) {
    el.innerHTML = "";
    var statusEl = statusId ? document.getElementById(statusId) : null;
    if (content.trim()) {
        el.classList.remove("empty");
        try {
            el.appendChild(latexToHtml(content));
            el.dataset.view = "compiled";
            if (statusEl) statusEl.textContent = "— compilé ✓";
        } catch (err) {
            el.textContent = content;
            el.dataset.view = "raw";
            if (statusEl) {
                statusEl.textContent = "— erreur de compilation : " + err.message;
                statusEl.classList.add("latex-error");
            }
            return;
        }
    } else {
        el.classList.add("empty");
        el.textContent = emptyMsg;
        if (statusEl) statusEl.textContent = "";
    }
    if (statusEl) statusEl.classList.remove("latex-error");
    if (isCorrection) {
        el.classList.add("correction");
    }
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
        dirty = true;
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
            dirty = true;
            statusEl.textContent = "Image associée à l'exercice.";
            updateImageUI();
            renderPreview();
        } catch (err) {
            statusEl.textContent = "Erreur : " + err.message;
            statusEl.style.color = "#990000";
        }
    });

    updateImageUI();
}

function updateImageUI() {
    var removeBtn = document.getElementById("f-image-remove");
    var statusEl = document.getElementById("f-image-status");
    if (currentId !== null) {
        removeBtn.style.display = exerciseImage ? "" : "none";
    }
    if (!exerciseImage && !statusEl.textContent.startsWith("Erreur") && currentId === null) {
        statusEl.textContent = "";
    }
    if (currentId === null) {
        removeBtn.style.display = "none";
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

// === Récupération de l'état du formulaire ===

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

// === Actions ===

function initActions() {
    document.getElementById("save-btn").addEventListener("click", saveExercise);
    document.getElementById("reset-btn").addEventListener("click", reloadFromDb);
}

function reloadFromDb() {
    if (currentId === null) return;
    if (dirty && !confirm("Recharger l'exercice #" + currentId + " depuis la base ? Les modifications non enregistrées seront perdues.")) return;
    loadExercise(currentId);
}

// === Enregistrement en base (PUT, réservé aux administrateurs) ===

async function saveExercise() {
    if (currentId === null) return;
    var statusEl = document.getElementById("save-status");
    var btn = document.getElementById("save-btn");

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
        var res = await fetch("/api/exercises/" + currentId, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (res.status === 403) {
            throw new Error("réservé aux administrateurs — connecte-toi avec un compte admin");
        }
        if (!res.ok) {
            var err = await res.json().catch(function () { return { detail: "Erreur" }; });
            throw new Error(err.detail || "Erreur lors de l'enregistrement");
        }
        var data = await res.json();
        dirty = false;
        setStatus("save-status", "Exercice #" + data.id + " mis à jour.");
        refreshExerciseList();
    } catch (err) {
        setStatus("save-status", "Erreur : " + err.message, true);
    } finally {
        btn.disabled = false;
    }
}

// === Utilitaires ===

function setStatus(id, msg, isError) {
    var el = document.getElementById(id);
    el.textContent = msg;
    el.style.color = isError ? "#990000" : "var(--bleu-fonce)";
}
