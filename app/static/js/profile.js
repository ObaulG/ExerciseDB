// === Page Profil — modèle de compétences ===

document.addEventListener("DOMContentLoaded", function () {
    loadProfile();
});

async function loadProfile() {
    var summaryEl = document.getElementById("profile-summary");
    var completedEl = document.getElementById("completed-container");
    var historyEl = document.getElementById("history-container");

    // Vérifie l'authentification
    var meRes = await fetch("/api/auth/me");
    if (!meRes.ok) {
        summaryEl.innerHTML =
            '<p class="profile-auth-required">Connectez-vous pour voir votre historique d\'évaluations.</p>';
        completedEl.innerHTML = "";
        historyEl.innerHTML = "";
        return;
    }

    // Charge en parallèle l'historique et les exercices complétés
    var attemptsRes = await fetch("/api/profile/attempts");
    var completedRes = await fetch("/api/profile/completed");

    var attemptsData = await attemptsRes.json();
    var completedData = await completedRes.json();

    var attempts = attemptsData.attempts || [];
    var completed = completedData.completed || [];

    renderSummary(attempts, completed);
    renderCompleted(completed);
    renderHistory(attempts);
}

function renderSummary(attempts, completed) {
    var el = document.getElementById("profile-summary");
    var total = attempts.length;
    var correct = attempts.filter(function (a) { return a.is_correct; }).length;
    var avg =
        total === 0
            ? "—"
            : (attempts.reduce(function (s, a) { return s + a.score; }, 0) / total).toFixed(1);

    el.innerHTML =
        '<div class="profile-stat">' +
        '<div class="profile-stat-value">' + total + '</div>' +
        '<div class="profile-stat-label">Tentatives</div>' +
        '</div>' +
        '<div class="profile-stat">' +
        '<div class="profile-stat-value">' + correct + '</div>' +
        '<div class="profile-stat-label">Réussies</div>' +
        '</div>' +
        '<div class="profile-stat">' +
        '<div class="profile-stat-value">' + avg + '/10</div>' +
        '<div class="profile-stat-label">Score moyen</div>' +
        '</div>' +
        '<div class="profile-stat">' +
        '<div class="profile-stat-value">' + completed.length + '</div>' +
        '<div class="profile-stat-label">Exercices complétés</div>' +
        '</div>';
}

function renderCompleted(completed) {
    var el = document.getElementById("completed-container");
    if (completed.length === 0) {
        el.innerHTML = '<p class="profile-empty">Aucun exercice complété pour le moment.</p>';
        return;
    }
    var html = '<div class="completed-list">';
    completed.forEach(function (id) {
        html +=
            '<span class="completed-chip">' +
            '<a href="/training">Exercice #' + id + '</a>' +
            '</span>';
    });
    html += '</div>';
    el.innerHTML = html;
}

function renderHistory(attempts) {
    var el = document.getElementById("history-container");
    if (attempts.length === 0) {
        el.innerHTML =
            '<p class="profile-empty">Aucune évaluation enregistrée. ' +
            'Entraînez-vous sur la page « Entraînement » pour alimenter votre historique.</p>';
        return;
    }

    el.innerHTML = "";
    attempts.forEach(function (a) {
        var item = document.createElement("div");
        item.className = "attempt-item";

        var header = document.createElement("div");
        header.className = "attempt-header";

        var title = document.createElement("span");
        title.className = "attempt-title";
        title.innerHTML =
            '<a href="/training">Exercice #' + a.exercise_id + ' — ' +
            escapeHtml(a.exercise_name) + '</a>';
        header.appendChild(title);

        var right = document.createElement("span");
        var score = document.createElement("span");
        score.className = "attempt-score" + (a.score < 5 ? " bad" : "");
        score.textContent = a.score + "/10";
        right.appendChild(score);

        var status = document.createElement("span");
        status.className = "attempt-status " + (a.is_correct ? "ok" : "ko");
        status.textContent = a.is_correct ? "Réussi" : "Échec";
        right.appendChild(status);
        header.appendChild(right);

        item.appendChild(header);

        var date = document.createElement("div");
        date.className = "attempt-date";
        date.textContent = formatDate(a.created_at);
        item.appendChild(date);

        var feedback = document.createElement("div");
        feedback.className = "attempt-feedback";
        feedback.innerHTML = "<strong>Feedback :</strong><br>" + escapeHtml(a.feedback);
        item.appendChild(feedback);

        var solution = document.createElement("div");
        solution.className = "attempt-solution";
        solution.innerHTML = "<strong>Solution :</strong><br>" + escapeHtml(a.corrected_solution);
        item.appendChild(solution);

        var answer = document.createElement("div");
        answer.className = "attempt-answer";
        answer.textContent = "Votre réponse : " + a.student_answer;
        item.appendChild(answer);

        el.appendChild(item);
        renderMath(item);
    });
}

function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
}

function formatDate(iso) {
    try {
        var d = new Date(iso);
        return d.toLocaleString("fr-FR", {
            dateStyle: "short",
            timeStyle: "short",
        });
    } catch (e) {
        return iso;
    }
}

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
