const form = document.getElementById("chat-form");
const problemInput = document.getElementById("problem-input");
const answerInput = document.getElementById("answer-input");
const messages = document.getElementById("chat-messages");
const statusBar = document.querySelector(".status-bar .status-field");
const msgCount = document.getElementById("msg-count");

let evaluationCount = 0;

function formatTime() {
    return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function addMessage(role, htmlContent) {
    const wrap = document.createElement("div");
    wrap.className = "message " + role;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = role === "user" ? "🧑‍🎓" : "🤖";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const header = document.createElement("div");
    header.className = "msg-header";
    header.innerHTML = (role === "user" ? "Moi" : "Assistant") + ' · <span class="msg-time">' + formatTime() + "</span>";

    const body = document.createElement("div");
    body.innerHTML = htmlContent;

    bubble.appendChild(header);
    bubble.appendChild(body);
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function addEvaluation(evaluation) {
    const verdict = evaluation.is_correct ? "✅ Correct" : "❌ Incorrect";
    const badge = '<span class="eval-badge ' + (evaluation.is_correct ? "eval-ok" : "eval-ko") + '">' + verdict + "</span>";
    const score = '<span class="eval-score">Note : ' + evaluation.score + "/10</span>";
    const feedback = "<p><strong>Feedback :</strong> " + escapeHtml(evaluation.feedback) + "</p>";
    const solution = "<p><strong>Solution correcte :</strong> " + escapeHtml(evaluation.corrected_solution) + "</p>";
    addMessage("bot", badge + " " + score + feedback + solution);
}

form.addEventListener("submit", function (event) {
    event.preventDefault();
    const problem = problemInput.value.trim();
    const answer = answerInput.value.trim();
    if (!problem || !answer) return;

    addMessage("user", "<p><strong>Problème :</strong> " + escapeHtml(problem) + "</p><p><strong>Ma réponse :</strong> " + escapeHtml(answer) + "</p>");
    problemInput.value = "";
    answerInput.value = "";
    statusBar.textContent = "Évaluation en cours...";

    fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: problem, student_answer: answer }),
    })
        .then(function (res) {
            if (!res.ok) {
                return res.json().then(function (err) {
                    throw new Error(err.detail || "Erreur serveur");
                });
            }
            return res.json();
        })
        .then(function (data) {
            addEvaluation(data);
            evaluationCount++;
            msgCount.textContent = evaluationCount + " évaluation(s)";
            statusBar.textContent = "Prêt";
        })
        .catch(function (err) {
            addMessage("bot", "<p>⚠️ " + escapeHtml(err.message) + "</p>");
            statusBar.textContent = "Erreur";
        });
});
