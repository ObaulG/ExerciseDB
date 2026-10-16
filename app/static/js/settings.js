var STORAGE_KEY = "mistral_api_key";

function getApiKey() {
    return localStorage.getItem(STORAGE_KEY) || "";
}

function setApiKey(key) {
    if (key) {
        localStorage.setItem(STORAGE_KEY, key);
    } else {
        localStorage.removeItem(STORAGE_KEY);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    var input = document.getElementById("api-key-input");
    var statusEl = document.getElementById("key-status");
    var savedStatusEl = document.getElementById("key-saved-status");
    var form = document.getElementById("api-key-form");
    var clearBtn = document.getElementById("clear-key-btn");
    var testBtn = document.getElementById("test-key-btn");
    var testResult = document.getElementById("key-test-result");

    // Afficher l'état actuel
    var existing = getApiKey();
    if (existing) {
        input.placeholder = "Clé enregistrée (" + existing.substring(0, 6) + "..." + existing.substring(existing.length - 4) + ")";
        savedStatusEl.textContent = "Clé enregistrée dans le navigateur";
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        var key = input.value.trim();
        if (!key) {
            statusEl.textContent = "Veuillez saisir une clé.";
            return;
        }
        setApiKey(key);
        input.value = "";
        input.placeholder = "Clé enregistrée (" + key.substring(0, 6) + "..." + key.substring(key.length - 4) + ")";
        statusEl.textContent = "Clé enregistrée.";
        savedStatusEl.textContent = "Clé enregistrée dans le navigateur";
    });

    clearBtn.addEventListener("click", function () {
        setApiKey("");
        input.value = "";
        input.placeholder = "ex: abc123def456...";
        statusEl.textContent = "Clé effacée.";
        savedStatusEl.textContent = "Aucune clé enregistrée";
        testResult.innerHTML = "";
    });

    testBtn.addEventListener("click", function () {
        var key = input.value.trim() || getApiKey();
        if (!key) {
            testResult.innerHTML = '<span class="test-ko">Aucune clé à tester.</span>';
            return;
        }
        testResult.innerHTML = '<span>Test en cours…</span>';
        fetch("/api/evaluate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Mistral-API-Key": key,
            },
            body: JSON.stringify({
                problem: "Combien font 2 + 2 ?",
                student_answer: "4",
            }),
        })
            .then(function (res) {
                if (res.ok) {
                    testResult.innerHTML = '<span class="test-ok">Clé valide — le chatbot fonctionne.</span>';
                } else {
                    return res.json().then(function (err) {
                        throw new Error(err.detail || "Erreur " + res.status);
                    });
                }
            })
            .catch(function (err) {
                testResult.innerHTML = '<span class="test-ko">Échec : ' + err.message + "</span>";
            });
    });
});
