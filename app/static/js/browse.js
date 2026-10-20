// === Page de consultation des exercices enregistrés ===
//
// Les constantes (TYPES_EXERCICE, NIVEAUX_SCOLAIRES, THEMES_DISPONIBLES) et
// renderMath() sont définies dans exercises-shared.js, chargé avant ce fichier.

let isAdmin = false;

document.addEventListener("DOMContentLoaded", function () {
    checkAdmin();
    loadExercises();
});

function checkAdmin() {
    fetch("/api/auth/me")
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (user) {
            if (user && user.is_admin) {
                isAdmin = true;
                loadExercises();
            }
        })
        .catch(function () {});
}

// === Liste des exercices enregistrés ===

function loadExercises() {
    var exerciseList = document.getElementById("exercise-list");
    var exerciseCount = document.getElementById("exercise-count");

    fetch("/api/exercises")
        .then(function (res) { return res.json(); })
        .then(function (exercises) {
            exerciseCount.textContent = exercises.length + " exercice(s)";
            exerciseList.innerHTML = "";
            exercises.forEach(function (ex) {
                exerciseList.appendChild(buildExerciseItem(ex));
            });
        });
}

function buildExerciseItem(ex) {
    var item = document.createElement("div");
    item.className = "exercise-item";

    var title = document.createElement("h3");
    title.textContent = "#" + ex.id + " — " + ex.name;

    var meta = document.createElement("div");
    meta.className = "meta";
    var metaParts = ["Ajouté le " + ex.created_at];
    if (ex.type) metaParts.push(ex.type);
    if (ex.niveau) metaParts.push(ex.niveau);
    if (ex.temps_estime) metaParts.push(ex.temps_estime + " min");
    meta.textContent = metaParts.join(" · ");

    item.appendChild(title);
    item.appendChild(meta);

    if (ex.themes && ex.themes.length > 0) {
        var tags = document.createElement("div");
        tags.className = "tags";
        ex.themes.forEach(function (t) {
            var tag = document.createElement("span");
            tag.className = "tag";
            tag.textContent = t;
            tags.appendChild(tag);
        });
        item.appendChild(tags);
    }

    var body = document.createElement("div");
    body.className = "exercise-text";
    renderLatexContent(body, ex.text);
    item.appendChild(body);

    (ex.corrections || []).forEach(function (c) {
        var block = document.createElement("div");
        block.className = "correction-block";
        renderLatexContent(block, c.text);
        item.appendChild(block);
    });

    var viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "retro-btn latex-view-btn";
    viewBtn.textContent = "\ud83d\udcc4 Texte brut";
    viewBtn.addEventListener("click", function () {
        var targets = [body].concat(Array.prototype.slice.call(item.querySelectorAll(".correction-block")));
        var switchingToRaw = body.dataset.view === "compiled";
        targets.forEach(function (el) { toggleLatexView(el); });
        viewBtn.textContent = switchingToRaw ? "\ud83d\udcdf LaTeX compil\u00e9" : "\ud83d\udcc4 Texte brut";
    });
    item.appendChild(viewBtn);

    if (isAdmin) {
        var adminActions = document.createElement("div");
        adminActions.className = "exercise-admin-actions";
        adminActions.style.marginTop = "6px";
        adminActions.style.display = "flex";
        adminActions.style.gap = "6px";
        adminActions.style.alignItems = "center";

        var editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "retro-btn edit-exercise-btn";
        editBtn.textContent = "✏️ Modifier";
        editBtn.addEventListener("click", function () {
            toggleEditForm(item, ex);
        });
        adminActions.appendChild(editBtn);

        var delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "retro-btn delete-exercise-btn";
        delBtn.textContent = "🗑️ Supprimer";
        delBtn.addEventListener("click", function () {
            deleteExercise(ex, item);
        });
        adminActions.appendChild(delBtn);

        item.appendChild(adminActions);
    }

    return item;
}

// === Insertion d'images dans le formulaire d'édition ===
var editImageFileInput = null;

function ensureEditImageFileInput() {
    if (editImageFileInput) return editImageFileInput;
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/gif,image/webp,image/svg+xml";
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("change", async function () {
        var file = input.files[0];
        if (!file) return;
        var textarea = input._targetTextarea;
        var statusEl = input._targetStatus;
        statusEl.textContent = "Envoi de l\u2019image\u2026";
        try {
            var dataBase64 = await fileToBase64Shared(file);
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
                throw new Error(err.detail || "Erreur lors de l\u2019envoi de l\u2019image");
            }
            var data = await res.json();
            insertAtCursorShared(textarea, "![" + file.name.replace(/\.[^.]+$/, "") + "](" + data.url + ")");
            statusEl.textContent = "Image ins\u00e9r\u00e9e.";
        } catch (err) {
            statusEl.textContent = "Erreur : " + err.message;
        }
    });
    editImageFileInput = input;
    return input;
}

function buildImageInsertRow(textarea) {
    var row = document.createElement("div");
    row.className = "image-insert-row";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "retro-btn image-insert-btn";
    btn.textContent = "\ud83d\uddbc\ufe0f Ins\u00e9rer une image";
    var status = document.createElement("span");
    status.className = "inline-status image-status";
    status.style.fontSize = "11px";
    btn.addEventListener("click", function () {
        var input = ensureEditImageFileInput();
        input._targetTextarea = textarea;
        input._targetStatus = status;
        input.value = "";
        input.click();
    });
    row.appendChild(btn);
    row.appendChild(status);
    return row;
}

function fileToBase64Shared(file) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
            resolve(String(reader.result).split(",")[1] || "");
        };
        reader.onerror = function () { reject(new Error("Lecture du fichier impossible")); };
        reader.readAsDataURL(file);
    });
}

function insertAtCursorShared(textarea, text) {
    var start = textarea.selectionStart != null ? textarea.selectionStart : textarea.value.length;
    var end = textarea.selectionEnd != null ? textarea.selectionEnd : start;
    textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
    var pos = start + text.length;
    textarea.setSelectionRange(pos, pos);
    textarea.focus();
    textarea.dispatchEvent(new Event("input"));
}

function toggleEditForm(item, ex) {
    var existingForm = item.querySelector(".edit-form");
    if (existingForm) {
        existingForm.remove();
        return;
    }

    var form = document.createElement("div");
    form.className = "edit-form";

    // Nom
    var lblName = document.createElement("label");
    lblName.textContent = "Titre";
    form.appendChild(lblName);
    var inpName = document.createElement("input");
    inpName.type = "text";
    inpName.value = ex.name;
    form.appendChild(inpName);

    // Énoncé
    var lblText = document.createElement("label");
    lblText.textContent = "Énoncé";
    form.appendChild(lblText);
    var taText = document.createElement("textarea");
    taText.rows = 4;
    taText.value = ex.text;
    form.appendChild(taText);
    form.appendChild(buildImageInsertRow(taText));

    // Ligne : Type + Niveau + Temps
    var row = document.createElement("div");
    row.className = "ex-card-row";

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
    fieldType.appendChild(selType);
    row.appendChild(fieldType);

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
    fieldNiveau.appendChild(selNiveau);
    row.appendChild(fieldNiveau);

    var fieldTemps = document.createElement("div");
    fieldTemps.className = "ex-card-field";
    var lblTemps = document.createElement("label");
    lblTemps.innerHTML = "Temps <span class=\"opt\">(min)</span>";
    fieldTemps.appendChild(lblTemps);
    var inpTemps = document.createElement("input");
    inpTemps.type = "number";
    inpTemps.min = "0";
    inpTemps.value = ex.temps_estime || "";
    fieldTemps.appendChild(inpTemps);
    row.appendChild(fieldTemps);

    form.appendChild(row);

    // Correction
    var lblCorrection = document.createElement("label");
    lblCorrection.textContent = "Correction";
    form.appendChild(lblCorrection);
    var taCorrection = document.createElement("textarea");
    taCorrection.rows = 3;
    var correctionText = (ex.corrections || []).map(function (c) { return c.text; }).join("\n\n");
    taCorrection.value = correctionText;
    form.appendChild(taCorrection);
    form.appendChild(buildImageInsertRow(taCorrection));

    // Boutons
    var actions = document.createElement("div");
    actions.className = "extract-actions";
    actions.style.marginTop = "8px";

    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "retro-btn primary";
    saveBtn.textContent = "💾 Enregistrer";

    var cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "retro-btn";
    cancelBtn.textContent = "Annuler";

    var statusSpan = document.createElement("span");
    statusSpan.style.fontSize = "11px";

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    actions.appendChild(statusSpan);
    form.appendChild(actions);

    cancelBtn.addEventListener("click", function () { form.remove(); });

    saveBtn.addEventListener("click", async function () {
        saveBtn.disabled = true;
        statusSpan.textContent = "Enregistrement…";

        var corrections = [];
        if (taCorrection.value.trim()) {
            corrections.push({ text: taCorrection.value.trim() });
        }

        try {
            var res = await fetch("/api/exercises/" + ex.id, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: inpName.value.trim(),
                    text: taText.value.trim(),
                    type: selType.value || null,
                    niveau: selNiveau.value || null,
                    temps_estime: inpTemps.value ? parseInt(inpTemps.value, 10) : null,
                    themes: ex.themes || [],
                    corrections: corrections,
                }),
            });

            if (!res.ok) {
                var err = await res.json().catch(function () { return { detail: "Erreur" }; });
                throw new Error(err.detail || "Erreur lors de la modification");
            }

            statusSpan.textContent = "Modifié.";
            setTimeout(function () { loadExercises(); }, 500);
        } catch (err) {
            statusSpan.textContent = "Erreur : " + err.message;
            saveBtn.disabled = false;
        }
    });

    item.appendChild(form);
}

async function deleteExercise(ex, item) {
    if (!confirm("Supprimer l'exercice #" + ex.id + " — « " + ex.name + " » ?\\nCette action est irréversible.")) {
        return;
    }

    var delBtn = item.querySelector(".delete-exercise-btn");
    if (delBtn) delBtn.disabled = true;

    try {
        var res = await fetch("/api/exercises/" + ex.id, { method: "DELETE" });
        if (!res.ok) {
            var err = await res.json().catch(function () { return { detail: "Erreur" }; });
            throw new Error(err.detail || "Erreur lors de la suppression");
        }
        loadExercises();
    } catch (err) {
        alert("Erreur : " + err.message);
        if (delBtn) delBtn.disabled = false;
    }
}
