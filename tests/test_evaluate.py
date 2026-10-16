from fastapi.testclient import TestClient

from app.llm.schemas import MathAnswerEvaluationSchema
from app.main import app


def test_evaluate_endpoint(monkeypatch):
    def fake_evaluate(problem, student_answer, api_key=None):
        return MathAnswerEvaluationSchema(
            is_correct=True,
            score=10,
            feedback="Parfait, raisonnement impeccable.",
            corrected_solution="x = 4 car 7 - 3 = 4.",
        )

    monkeypatch.setattr("app.routes.evaluate_answer", fake_evaluate)
    client = TestClient(app)

    response = client.post(
        "/api/evaluate",
        json={"problem": "Résous x + 3 = 7", "student_answer": "x = 4"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_correct"] is True
    assert data["score"] == 10
    assert "feedback" in data
    assert "corrected_solution" in data


def test_evaluate_missing_fields():
    client = TestClient(app)
    response = client.post("/api/evaluate", json={"problem": "1+1"})
    assert response.status_code == 422
