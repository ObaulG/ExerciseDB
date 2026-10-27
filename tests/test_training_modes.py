import pytest
from fastapi.testclient import TestClient

from app.llm.schemas import GuidanceOutputSchema, MathAnswerEvaluationSchema
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


def test_grade_mode_returns_evaluation_and_persists(client, monkeypatch):
    exercise_id = _create_exercise(client)
    _register_and_login(client)

    def fake_evaluate(problem, student_answer, api_key=None, reference_correction=None):
        return MathAnswerEvaluationSchema(
            is_correct=True,
            score=9,
            feedback="Très bien.",
            corrected_solution="$x = 4$.",
        )

    monkeypatch.setattr("app.routes.evaluate_answer", fake_evaluate)

    resp = client.post(
        "/api/training/evaluate",
        json={
            "answers": [{"exercise_id": exercise_id, "student_answer": "x = 4"}],
            "mode": "grade",
        },
    )
    assert resp.status_code == 200
    item = resp.json()["results"][0]
    assert item["mode"] == "grade"
    assert item["evaluation"]["is_correct"] is True
    assert item["evaluation"]["score"] == 9
    assert item["guidance"] is None
    assert item["completed"] is True

    # Persistance effective
    attempts = client.get("/api/profile/attempts").json()["attempts"]
    assert len(attempts) == 1
    assert attempts[0]["score"] == 9


def test_guide_mode_returns_guidance_and_does_not_persist(client, monkeypatch):
    exercise_id = _create_exercise(client)
    _register_and_login(client)

    def fake_guide(problem, student_answer, api_key=None, reference_correction=None):
        return GuidanceOutputSchema(
            status="erreurs",
            errors="Tu as écrit $x = 3$ : c'est $3 + 3 = 6$, pas $7$.",
            hints="Reprends l'équation et isole $x$ en soustrayant $3$.",
            missing="",
        )

    monkeypatch.setattr("app.routes.guide_answer", fake_guide)

    resp = client.post(
        "/api/training/evaluate",
        json={
            "answers": [{"exercise_id": exercise_id, "student_answer": "x = 3"}],
            "mode": "guide",
        },
    )
    assert resp.status_code == 200
    item = resp.json()["results"][0]
    assert item["mode"] == "guide"
    assert item["guidance"]["status"] == "erreurs"
    assert "x = 3" in item["guidance"]["errors"]
    assert item["evaluation"] is None
    assert item["completed"] is False

    # Mode guide : aucune tentative persistée
    attempts = client.get("/api/profile/attempts").json()["attempts"]
    assert attempts == []
    completed = client.get("/api/profile/completed").json()["completed"]
    assert completed == []


def test_guide_mode_incomplete_answer(client, monkeypatch):
    exercise_id = _create_exercise(client)

    def fake_guide(problem, student_answer, api_key=None, reference_correction=None):
        return GuidanceOutputSchema(
            status="incomplet",
            errors="",
            hints="Tu as posé le calcul mais pas conclu.",
            missing="Donne la valeur finale de $x$.",
        )

    monkeypatch.setattr("app.routes.guide_answer", fake_guide)

    resp = client.post(
        "/api/training/evaluate",
        json={
            "answers": [{"exercise_id": exercise_id, "student_answer": "x = 7 - 3"}],
            "mode": "guide",
        },
    )
    assert resp.status_code == 200
    item = resp.json()["results"][0]
    assert item["guidance"]["status"] == "incomplet"
    assert item["guidance"]["missing"] == "Donne la valeur finale de $x$."


def test_invalid_mode_rejected(client):
    exercise_id = _create_exercise(client)
    resp = client.post(
        "/api/training/evaluate",
        json={
            "answers": [{"exercise_id": exercise_id, "student_answer": "x = 4"}],
            "mode": "bogus",
        },
    )
    assert resp.status_code == 422


def test_default_mode_is_grade(client, monkeypatch):
    exercise_id = _create_exercise(client)

    def fake_evaluate(problem, student_answer, api_key=None, reference_correction=None):
        return MathAnswerEvaluationSchema(
            is_correct=False,
            score=2,
            feedback="ko",
            corrected_solution="$x = 4$.",
        )

    monkeypatch.setattr("app.routes.evaluate_answer", fake_evaluate)

    resp = client.post(
        "/api/training/evaluate",
        json={"answers": [{"exercise_id": exercise_id, "student_answer": "x = 3"}]},
    )
    assert resp.status_code == 200
    assert resp.json()["results"][0]["mode"] == "grade"
