import pytest
from fastapi.testclient import TestClient

from app.llm.schemas import MathAnswerEvaluationSchema
from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def _create_exercise(client) -> int:
    payload = {
        "name": "Équation simple",
        "text": "Résous $x + 3 = 7$.",
        "corrections": [{"text": "$x = 4$."}],
    }
    resp = client.post("/api/exercises", json=payload)
    assert resp.status_code == 201
    return resp.json()["exercise"]["id"]


def _register_and_login(client, pseudo="eleve1") -> None:
    client.post("/api/auth/register", json={"pseudo": pseudo, "password": "secret123"})
    client.post("/api/auth/login", json={"pseudo": pseudo, "password": "secret123"})


def test_training_evaluate_records_attempt_when_logged_in(client, monkeypatch):
    exercise_id = _create_exercise(client)
    _register_and_login(client)

    def fake_evaluate(problem, student_answer, api_key=None, reference_correction=None):
        return MathAnswerEvaluationSchema(
            is_correct=True,
            score=10,
            feedback="Parfait.",
            corrected_solution="x = 4.",
        )

    monkeypatch.setattr("app.routes.evaluate_answer", fake_evaluate)

    resp = client.post(
        "/api/training/evaluate",
        json={"answers": [{"exercise_id": exercise_id, "student_answer": "x = 4"}]},
    )
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert results[0]["evaluation"]["is_correct"] is True
    assert results[0]["completed"] is True

    # La tentative est persistée et visible via le profil
    attempts = client.get("/api/profile/attempts").json()["attempts"]
    assert len(attempts) == 1
    assert attempts[0]["exercise_id"] == exercise_id
    assert attempts[0]["is_correct"] is True
    assert attempts[0]["score"] == 10
    assert attempts[0]["exercise_name"] == "Équation simple"

    completed = client.get("/api/profile/completed").json()["completed"]
    assert exercise_id in completed


def test_training_evaluate_no_persistence_when_anonymous(client, monkeypatch):
    exercise_id = _create_exercise(client)

    def fake_evaluate(problem, student_answer, api_key=None, reference_correction=None):
        return MathAnswerEvaluationSchema(
            is_correct=True,
            score=9,
            feedback="Bien.",
            corrected_solution="x = 4.",
        )

    monkeypatch.setattr("app.routes.evaluate_answer", fake_evaluate)

    resp = client.post(
        "/api/training/evaluate",
        json={"answers": [{"exercise_id": exercise_id, "student_answer": "x = 4"}]},
    )
    assert resp.status_code == 200
    # Pas de user connecté : completed reste False, rien n'est persisté
    assert resp.json()["results"][0]["completed"] is False
    assert client.get("/api/profile/attempts").status_code == 401


def test_completed_requires_success(client, monkeypatch):
    exercise_id = _create_exercise(client)
    _register_and_login(client)

    calls = {"n": 0}

    def fake_evaluate(problem, student_answer, api_key=None, reference_correction=None):
        calls["n"] += 1
        # Première tentative : échec ; deuxième : réussite
        correct = calls["n"] == 2
        return MathAnswerEvaluationSchema(
            is_correct=correct,
            score=10 if correct else 2,
            feedback="ok" if correct else "ko",
            corrected_solution="x = 4.",
        )

    monkeypatch.setattr("app.routes.evaluate_answer", fake_evaluate)

    # 1re tentative : incorrecte
    resp = client.post(
        "/api/training/evaluate",
        json={"answers": [{"exercise_id": exercise_id, "student_answer": "x = 3"}]},
    )
    assert resp.json()["results"][0]["completed"] is False

    # 2e tentative : correcte
    resp = client.post(
        "/api/training/evaluate",
        json={"answers": [{"exercise_id": exercise_id, "student_answer": "x = 4"}]},
    )
    assert resp.json()["results"][0]["completed"] is True

    # Deux tentatives dans l'historique, un exercice complété
    attempts = client.get("/api/profile/attempts").json()["attempts"]
    assert len(attempts) == 2
    completed = client.get("/api/profile/completed").json()["completed"]
    assert completed == [exercise_id]


def test_profile_endpoints_require_auth(client):
    assert client.get("/api/profile/attempts").status_code == 401
    assert client.get("/api/profile/completed").status_code == 401
