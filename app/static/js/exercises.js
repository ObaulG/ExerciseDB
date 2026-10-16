const form = document.getElementById("exercise-form");
const correctionsContainer = document.getElementById("corrections-container");
const addCorrectionBtn = document.getElementById("add-correction");
const formStatus = document.getElementById("form-status");
const exerciseList = document.getElementById("exercise-list");
const exerciseCount = document.getElementById("exercise-count");

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

addCorrectionBtn.addEventListener("click", function () {
    const textarea = document.createElement("textarea");
    textarea.className = "correction";
    textarea.rows = 2;
    textarea.placeholder = "Texte du corrigé (LaTeX autorisé)...";
    correctionsContainer.appendChild(textarea);
    textarea.focus();
});

form.addEventListener("submit", function (event) {
    event.preventDefault();
    const corrections = Array.from(document.querySelectorAll(".correction"))
        .map(function (t) { return t.value.trim(); })
        .filter(Boolean);

    fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: document.getElementById("name").value.trim(),
            text: document.getElementById("text").value.trim(),
            corrections: corrections.map(function (t) { return { text: t }; }),
        }),
    })
        .then(function (res) {
            if (!res.ok) return res.json().then(function (e) { throw new Error(e.detail || "Erreur"); });
            return res.json();
        })
        .then(function (data) {
            formStatus.textContent = "✔ Exercice #" + data.id + " enregistré";
            form.reset();
            document.querySelectorAll(".correction").forEach(function (t, i) {
                if (i > 0) t.remove();
            });
            loadExercises();
        })
        .catch(function (err) { formStatus.textContent = "⚠️ " + err.message; });
});

function loadExercises() {
    fetch("/api/exercises")
        .then(function (res) { return res.json(); })
        .then(function (exercises) {
            exerciseCount.textContent = exercises.length + " exercice(s)";
            exerciseList.innerHTML = "";
            exercises.forEach(function (ex) {
                const item = document.createElement("div");
                item.className = "exercise-item";

                const title = document.createElement("h3");
                title.textContent = "#" + ex.id + " — " + ex.name;

                const meta = document.createElement("div");
                meta.className = "meta";
                meta.textContent = "Ajouté le " + ex.created_at;

                const body = document.createElement("div");
                body.className = "exercise-text";
                body.textContent = ex.text;

                item.appendChild(title);
                item.appendChild(meta);
                item.appendChild(body);

                (ex.corrections || []).forEach(function (c) {
                    const block = document.createElement("div");
                    block.className = "correction-block";
                    block.textContent = c.text;
                    item.appendChild(block);
                });

                exerciseList.appendChild(item);
                renderMath(item);
            });
        });
}

document.addEventListener("DOMContentLoaded", loadExercises);
