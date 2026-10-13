const authZone = document.getElementById("auth-zone");
const loginForm = document.getElementById("login-form");
const userZone = document.getElementById("user-zone");
const authError = document.getElementById("auth-error");
const userPseudo = document.getElementById("user-pseudo");

function refreshHeader() {
    fetch("/api/auth/me")
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (user) {
            if (user) {
                loginForm.style.display = "none";
                userZone.style.display = "flex";
                userPseudo.textContent = user.pseudo;
                const profilePseudo = document.getElementById("profile-pseudo");
                if (profilePseudo) profilePseudo.textContent = user.pseudo;
            } else {
                loginForm.style.display = "flex";
                userZone.style.display = "none";
            }
        });
}

loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    authError.textContent = "";
    const pseudo = document.getElementById("login-pseudo").value.trim();
    const password = document.getElementById("login-password").value;
    submitAuth("/api/auth/login", pseudo, password);
});

document.getElementById("register-btn").addEventListener("click", function () {
    authError.textContent = "";
    const pseudo = document.getElementById("login-pseudo").value.trim();
    const password = document.getElementById("login-password").value;
    submitAuth("/api/auth/register", pseudo, password);
});

function submitAuth(endpoint, pseudo, password) {
    fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudo: pseudo, password: password }),
    })
        .then(function (res) {
            return res.json().then(function (data) { return { ok: res.ok, data: data }; });
        })
        .then(function (result) {
            if (!result.ok) {
                authError.textContent = "⚠️ " + (result.data.detail || "Erreur");
                if (typeof result.data.detail === "object") {
                    authError.textContent = "⚠️ Champs invalides";
                }
                return;
            }
            if (endpoint.endsWith("/register")) {
                submitAuth("/api/auth/login", pseudo, password);
                return;
            }
            loginForm.reset();
            refreshHeader();
        });
}

document.getElementById("logout-btn").addEventListener("click", function () {
    fetch("/api/auth/logout", { method: "POST" }).then(refreshHeader);
});

document.addEventListener("DOMContentLoaded", refreshHeader);
