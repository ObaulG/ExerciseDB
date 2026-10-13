const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");
const messages = document.getElementById("chat-messages");
const statusBar = document.querySelector(".status-bar .status-field");

function formatTime() {
    return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function addMessage(role, text) {
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

    const p = document.createElement("p");
    p.textContent = text;

    bubble.appendChild(header);
    bubble.appendChild(p);
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
}

form.addEventListener("submit", function (event) {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addMessage("user", text);
    input.value = "";
    statusBar.textContent = "Envoi...";

    setTimeout(function () {
        addMessage("bot", "Fonction de réponse LLM à venir — message reçu : « " + text + " »");
        statusBar.textContent = "Prêt";
    }, 500);
});
