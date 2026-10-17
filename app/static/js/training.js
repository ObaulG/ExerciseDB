// === Page Entraînement ===

const MAX_SELECTION = 6;

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

// État : exercices sélectionnés [{ id, name, text, type, niveau, themes }]
let selectedExercises = [];

// === Initialisation ===

document.addEventListener("DOMContentLoaded", function () {
    populateFilters();
    initSearchForm();
    initSelectionActions();
    initSubmitButton();
});

// === Filtres ===

function populateFilters() {
    var selType = document.getElementById("search-type");
    TYPES_EXERCICE.forEach(function (t) {
        var opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        selType.appendChild(opt);
    });

    var selNiveau = document.getElementById("search-niveau");
    NIVEAUX_SCOLAIRES.forEach(function (n) {
        var opt = document.createElement("option");
        opt.value = n;
        opt.textContent = n;
        selNiveau.appendChild(opt);
    });

    // Thèmes chargés depuis l'API
    fetch("/api/themes")
        .then(function (res) { return res.json(); })
        .then(function (data) {
            var selTheme = document.getElementById("search-theme");
            (data.themes || []).forEach(function (t) {
                var opt = document.createElement("option");
                opt.value = t;
                opt.textContent = t;
                selTheme.appendChild(opt);
            });
        })
        .catch(function () { /* l'API peut échouer si la DB n'est pas connectée */ });
}

// === Recherche ===

function initSearchForm() {
    document.getElementById("search-form").addEventListener("submit", function (e) {
        e.preventDefault();
        doSearch();
    });
}

async function doSearch() {
    var query = document.getElementById("search-query").value.trim();
    var type = document.getElementById("search-type").value;
    var niveau = document.getElementById("search-niveau").value;
    var theme = document.getElementById("search-theme").value;

    var params = new URLSearchParams();
    if (query) params.set("q", query);
    if (type) params.set("type", type);
    if (niveau) params.set("niveau", niveau);
    if (theme) params.set("theme", theme);

    var resultsEl = document.getElementById("search-results");
    resultsEl.innerHTML = '<p class="search-hint">Recherche en cours…</p>';

    try {
        var res = await fetch("/api/exercises/search?" + params.toString());
        if (!res.ok) throw new Error("Erreur de recherche");
        var data = await res.json();
        renderSearchResults(data.exercises || []);
    } catch (err) {
        resultsEl.innerHTML = '<p class="search-hint">Erreur : ' + err.message + "</p>";
    }
}

function renderSearchResults(exercises) {
    var container = document.getElementById("search-results");

    if (exercises.length === 0) {
        container.innerHTML = '<p class="search-hint">Aucun exercice trouvé.</p>';
        return;
    }

    container.innerHTML = "";
    exercises.forEach(function (ex) {
        var item = document.createElement("div");
        item.className = "search-result-item";

        var info = document.createElement("div");
        info.className = "search-result-info";

        var title = document.createElement("div");
        title.className = "search-result-title";
        title.textContent = "#" + ex.id + " — " + ex.name;
        info.appendChild(title);

        var meta = document.createElement("div");
        meta.className = "search-result-meta";
        var metaParts = [];
        if (ex.type) metaParts.push(ex.type);
        if (ex.niveau) metaParts.push(ex.niveau);
        if (ex.temps_estime) metaParts.push(ex.temps_estime + " min");
        meta.textContent = metaParts.join(" · ");
        info.appendChild(meta);

        if (ex.themes && ex.themes.length > 0) {
            var tags = document.createElement("div");
            tags.className = "search-result-themes";
            ex.themes.forEach(function (t) {
                var tag = document.createElement("span");
                tag.className = "tag";
                tag.textContent = t;
                tags.appendChild(tag);
            });
            info.appendChild(tags);
        }

        var text = document.createElement("div");
        text.className = "search-result-text";
        text.textContent = ex.text;
        info.appendChild(text);

        item.appendChild(info);

        // Bouton d'ajout
        var addDiv = document.createElement("div");
        addDiv.className = "search-result-add";
        var addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "retro-btn";
        addBtn.textContent = "+";
        addBtn.title = "Ajouter à la sélection";

        var alreadySelected = selectedExercises.some(function (s) { return s.id === ex.id; });
        if (alreadySelected || selectedExercises.length >= MAX_SELECTION) {
            addBtn.disabled = true;
            if (alreadySelected) addBtn.title = "Déjà sélectionné";
            else addBtn.title = "Maximum " + MAX_SELECTION + " exercices";
        }

        addBtn.addEventListener("click", function () {
            addToSelection(ex);
            addBtn.disabled = true;
            addBtn.title = "Déjà sélectionné";
        });

        addDiv.appendChild(addBtn);
        item.appendChild(addDiv);

        container.appendChild(item);
        renderMath(info);
    });
}

// === Sélection ===

function addToSelection(ex) {
    if (selectedExercises.length >= MAX_SELECTION) return;
    if (selectedExercises.some(function (s) { return s.id === ex.id; })) return;

    // On ne garde que les champs nécessaires (pas de correction transmise au client)
    selectedExercises.push({
        id: ex.id,
        name: ex.name,
        text: ex.text,
        type: ex.type,
        niveau: ex.niveau,
        themes: ex.themes || [],
    });

    renderSelection();
}

function removeFromSelection(id) {
    selectedExercises = selectedExercises.filter(function (s) { return s.id !== id; });
    renderSelection();
    // Ré-active les boutons de recherche
    doSearch();
}

function renderSelection() {
    var container = document.getElementById("selection-list");
    var countEl = document.getElementById("selection-count");
    var validateBtn = document.getElementById("validate-selection-btn");

    countEl.textContent = selectedExercises.length;
    validateBtn.disabled = selectedExercises.length === 0;

    if (selectedExercises.length === 0) {
        container.innerHTML = '<p class="selection-hint">Aucun exercice sélectionné. Utilisez la recherche ci-dessus.</p>';
        return;
    }

    container.innerHTML = "";
    selectedExercises.forEach(function (ex, idx) {
        var item = document.createElement("div");
        item.className = "selection-item";

        var num = document.createElement("span");
        num.className = "selection-item-num";
        num.textContent = (idx + 1) + ".";
        item.appendChild(num);

        var title = document.createElement("span");
        title.className = "selection-item-title";
        title.textContent = "#" + ex.id + " — " + ex.name;
        item.appendChild(title);

        var meta = document.createElement("span");
        meta.className = "selection-item-meta";
        var metaParts = [];
        if (ex.type) metaParts.push(ex.type);
        if (ex.niveau) metaParts.push(ex.niveau);
        meta.textContent = metaParts.join(" · ");
        item.appendChild(meta);

        var rm = document.createElement("button");
        rm.className = "selection-item-remove";
        rm.type = "button";
        rm.textContent = "×";
        rm.title = "Retirer de la sélection";
        rm.addEventListener("click", function () { removeFromSelection(ex.id); });
        item.appendChild(rm);

        container.appendChild(item);
    });
}

function initSelectionActions() {
    document.getElementById("validate-selection-btn").addEventListener("click", function () {
        if (selectedExercises.length === 0) return;
        showWorkZone();
    });

    document.getElementById("clear-selection-btn").addEventListener("click", function () {
        selectedExercises = [];
        renderSelection();
        document.getElementById("work-window").style.display = "none";
        doSearch();
    });
}

// === Zone de travail ===

function showWorkZone() {
    var workWindow = document.getElementById("work-window");
    var container = document.getElementById("work-container");
    workWindow.style.display = "";
    container.innerHTML = "";

    selectedExercises.forEach(function (ex, idx) {
        var block = document.createElement("div");
        block.className = "work-exercise";
        block.dataset.exerciseId = ex.id;

        var header = document.createElement("div");
        header.className = "work-exercise-header";
        header.textContent = "Exercice " + (idx + 1) + " : " + ex.name;

        var meta = document.createElement("span");
        meta.className = "work-exercise-meta";
        var metaParts = [];
        if (ex.type) metaParts.push(ex.type);
        if (ex.niveau) metaParts.push(ex.niveau);
        meta.textContent = "  (" + metaParts.join(" · ") + ")";
        header.appendChild(meta);

        block.appendChild(header);

        var body = document.createElement("div");
        body.className = "work-exercise-body";

        var text = document.createElement("div");
        text.className = "work-exercise-text";
        text.textContent = ex.text;
        body.appendChild(text);

        var answerDiv = document.createElement("div");
        answerDiv.className = "work-exercise-answer";

        var label = document.createElement("label");
        label.textContent = "Votre réponse :";
        answerDiv.appendChild(label);

        var textarea = document.createElement("textarea");
        textarea.rows = 4;
        textarea.className = "work-answer-input";
        textarea.dataset.exerciseId = ex.id;
        textarea.placeholder = "Rédigez votre réponse et votre raisonnement ici…";
        answerDiv.appendChild(textarea);

        body.appendChild(answerDiv);
        block.appendChild(body);
        container.appendChild(block);

        renderMath(text);
    });

    // Scroll vers la zone de travail
    workWindow.scrollIntoView({ behavior: "smooth" });
}

// === Soumission des réponses ===

function initSubmitButton() {
    document.getElementById("submit-answers-btn").addEventListener("click", submitAnswers);
}

async function submitAnswers() {
    var statusEl = document.getElementById("submit-status");
    var btn = document.getElementById("submit-answers-btn");
    var resultsContainer = document.getElementById("results-container");

    // Récupère les réponses
    var answers = [];
    var textareas = document.querySelectorAll(".work-answer-input");
    for (var i = 0; i < textareas.length; i++) {
        var ta = textareas[i];
        var answer = ta.value.trim();
        if (!answer) {
            statusEl.textContent = "Veuillez répondre à tous les exercices.";
            return;
        }
        answers.push({
            exercise_id: parseInt(ta.dataset.exerciseId, 10),
            student_answer: answer,
        });
    }

    if (answers.length === 0) {
        statusEl.textContent = "Aucune réponse à envoyer.";
        return;
    }

    btn.disabled = true;
    statusEl.textContent = "Évaluation en cours…";
    resultsContainer.innerHTML = "";

    var headers = { "Content-Type": "application/json" };
    var apiKey = localStorage.getItem("mistral_api_key") || "";
    if (apiKey) headers["X-Mistral-API-Key"] = apiKey;

    try {
        var res = await fetch("/api/training/evaluate", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ answers: answers }),
        });

        if (!res.ok) {
            var err = await res.json().catch(function () { return { detail: "Erreur" }; });
            throw new Error(err.detail || "Erreur lors de l'évaluation");
        }

        var data = await res.json();
        renderResults(data.results || []);
        statusEl.textContent = "Évaluation terminée.";
    } catch (err) {
        statusEl.textContent = "Erreur : " + err.message;
    }

    btn.disabled = false;
}

function renderResults(results) {
    var container = document.getElementById("results-container");
    container.innerHTML = "";

    results.forEach(function (r, idx) {
        var eval_ = r.evaluation;
        var block = document.createElement("div");
        block.className = "eval-result";

        var header = document.createElement("div");
        header.className = "eval-result-header";

        var title = document.createElement("span");
        title.textContent = "Exercice #" + r.exercise_id;
        header.appendChild(title);

        var score = document.createElement("span");
        score.className = "eval-result-score" + (eval_.score < 5 ? " bad" : "");
        score.textContent = eval_.score + "/10";
        header.appendChild(score);

        var correct = document.createElement("span");
        correct.textContent = eval_.is_correct ? "✓ Correct" : "✗ Incorrect";
        header.appendChild(correct);

        block.appendChild(header);

        var body = document.createElement("div");
        body.className = "eval-result-body";

        var feedback = document.createElement("div");
        feedback.className = "eval-result-feedback";
        feedback.innerHTML = "<strong>Feedback :</strong><br>" + eval_.feedback;
        body.appendChild(feedback);

        var correction = document.createElement("div");
        correction.className = "eval-result-correction";
        correction.innerHTML = "<strong>Solution :</strong><br>" + eval_.corrected_solution;
        body.appendChild(correction);

        var source = document.createElement("div");
        source.className = "eval-result-source";
        source.textContent = r.correction_source === "db"
            ? "Corrigé issu de la base de données."
            : "Corrigé généré dynamiquement par l'agent LLM.";
        body.appendChild(source);

        block.appendChild(body);
        container.appendChild(block);
        renderMath(body);
    });
}

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
