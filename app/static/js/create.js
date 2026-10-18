// === Constantes (partagées avec exercises.js) ===

// Les constantes (TYPES_EXERCICE, NIVEAUX_SCOLAIRES, THEMES_DISPONIBLES) et
// renderMath() sont définies dans exercises-shared.js, chargé avant ce fichier.

// === État ===

let themes = [];
let aiProposal = null; // dernière proposition de l'IA

// === Initialisation ===

document.addEventListener("DOMContentLoaded", function () {
    initSelects();
    initFormListeners();
    initThemesBlock();
    initActions();
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
        }
    });
    addDiv.appendChild(sel);
    container.appendChild(addDiv);
}

// === Aperçu en direct ===

function renderPreview() {
    var text = document.getElementById("f-text").value;
    var correction = document.getElementById("f-correction").value;

    var previewText = document.getElementById("preview-text");
    var previewCorrection = document.getElementById("preview-correction");

    fillPreview(previewText, text, "Énoncé vide — remplis le formulaire.");
    fillPreview(previewCorrection, correction, "Aucune correction saisie.", true);
}

function fillPreview(el, content, emptyMsg, isCorrection) {
    el.innerHTML = "";
    if (content.trim()) {
        el.classList.remove("empty");
        el.textContent = content;
        renderMath(el);
    } else {
        el.classList.add("empty");
        el.textContent = emptyMsg;
    }
    if (isCorrection) {
        el.classList.add("correction");
    }
}

// === Récupération / remplissage de l'état du formulaire ===

function getFormState() {
    return {
        name: document.getElementById("f-name").value,
        text: document.getElementById("f-text").value,
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

function applyState(state) {
    document.getElementById("f-name").value = state.name || "";
    document.getElementById("f-text").value = state.text || "";
    document.getElementById("f-type").value = state.type || "";
    document.getElementById("f-niveau").value = state.niveau || "";
    document.getElementById("f-temps").value = state.temps_estime != null ? String(state.temps_estime) : "";
    themes = Array.isArray(state.themes) ? state.themes.slice() : [];
    // L'IA peut renvoyer plusieurs corrigés : on concatène avec une séparatrice.
    var corrections = Array.isArray(state.corrections) ? state.corrections : [];
    document.getElementById("f-correction").value = corrections.join("\n\n");
    renderThemesBlock();
    renderPreview();
}

// === Actions ===

function initActions() {
    document.getElementById("save-btn").addEventListener("click", saveExercise);
    document.getElementById("reset-btn").addEventListener("click", resetForm);
    document.getElementById("ai-run-btn").addEventListener("click", runAI);
    document.getElementById("ai-clear-btn").addEventListener("click", function () {
        document.getElementById("ai-instruction").value = "";
        document.getElementById("ai-instruction").focus();
    });
    document.getElementById("ai-apply-btn").addEventListener("click", applyAIProposal);
    document.getElementById("ai-dismiss-btn").addEventListener("click", dismissAIProposal);
}

function resetForm() {
    if (!confirm("Réinitialiser le formulaire ? Les saisies en cours seront perdues.")) return;
    document.getElementById("f-name").value = "";
    document.getElementById("f-text").value = "";
    document.getElementById("f-type").value = "";
    document.getElementById("f-niveau").value = "";
    document.getElementById("f-temps").value = "";
    document.getElementById("f-correction").value = "";
    themes = [];
    renderThemesBlock();
    renderPreview();
    dismissAIProposal();
    setStatus("save-status", "Formulaire réinitialisé.");
}

// === Enregistrement en base ===

async function saveExercise() {
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

// === Assistant IA ===

async function runAI() {
    var instruction = document.getElementById("ai-instruction").value.trim();
    var statusEl = document.getElementById("ai-status");
    var btn = document.getElementById("ai-run-btn");

    if (!instruction) {
        setStatus("ai-status", "Écris d'abord une instruction.", true);
        return;
    }

    var state = getFormState();
    btn.disabled = true;
    setStatus("ai-status", "L'IA réfléchit…");
    document.getElementById("ai-result").style.display = "none";

    var headers = { "Content-Type": "application/json" };
    var apiKey = localStorage.getItem("mistral_api_key") || "";
    if (apiKey) {
        headers["X-Mistral-API-Key"] = apiKey;
    }

    var payload = {
        name: state.name,
        text: state.text,
        type: state.type || null,
        niveau: state.niveau || null,
        temps_estime: state.temps_estime ? parseInt(state.temps_estime, 10) : null,
        themes: state.themes,
        corrections: state.corrections,
        instruction: instruction,
    };

    try {
        var res = await fetch("/api/exercises/ai-edit", {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            var err = await res.json().catch(function () { return { detail: "Erreur" }; });
            throw new Error(err.detail || "Erreur lors de l'appel à l'IA");
        }
        var data = await res.json();
        aiProposal = data.exercise;
        renderAIProposal(data.summary || "");
        setStatus("ai-status", "Proposition prête. Relis-la puis applique-la au formulaire.");
    } catch (err) {
        setStatus("ai-status", "Erreur : " + err.message, true);
    } finally {
        btn.disabled = false;
    }
}

function renderAIProposal(summary) {
    if (!aiProposal) return;
    var resultEl = document.getElementById("ai-result");
    var diffEl = document.getElementById("ai-diff");
    var summaryEl = document.getElementById("ai-summary");

    summaryEl.textContent = summary;
    diffEl.innerHTML = "";

    var current = getFormState();
    var currentCorrections = current.corrections.join("\n\n");
    var proposedCorrections = (aiProposal.corrections || []).join("\n\n");

    var fields = [
        { label: "Titre", current: current.name, proposed: aiProposal.name || "" },
        { label: "Énoncé", current: current.text, proposed: aiProposal.text || "" },
        { label: "Type", current: current.type, proposed: aiProposal.type || "" },
        { label: "Niveau", current: current.niveau, proposed: aiProposal.niveau || "" },
        {
            label: "Temps (min)",
            current: current.temps_estime != null ? String(current.temps_estime) : "",
            proposed: aiProposal.temps_estime != null ? String(aiProposal.temps_estime) : "",
        },
        { label: "Thèmes", current: current.themes.join(", "), proposed: (aiProposal.themes || []).join(", ") },
        { label: "Correction", current: currentCorrections, proposed: proposedCorrections },
    ];

    fields.forEach(function (f) {
        var changed = f.current !== f.proposed;
        var block = document.createElement("div");
        block.className = "diff-field";

        var label = document.createElement("div");
        label.className = "diff-label";
        label.textContent = f.label + (changed ? " — modifié" : "");
        block.appendChild(label);

        var value = document.createElement("div");
        value.className = "diff-value" + (changed ? " changed" : "");
        value.textContent = f.proposed || "(vide)";
        block.appendChild(value);

        renderMath(block);
        diffEl.appendChild(block);
    });

    resultEl.style.display = "block";
}

function applyAIProposal() {
    if (!aiProposal) return;
    applyState(aiProposal);
    setStatus("ai-status", "Proposition appliquée. Vérifie le rendu puis enregistre.");
    dismissAIProposal();
}

function dismissAIProposal() {
    aiProposal = null;
    document.getElementById("ai-result").style.display = "none";
    document.getElementById("ai-diff").innerHTML = "";
    document.getElementById("ai-summary").textContent = "";
}

// === Utilitaires ===

function setStatus(id, msg, isError) {
    var el = document.getElementById(id);
    el.textContent = msg;
    el.style.color = isError ? "#990000" : "var(--bleu-fonce)";
}
