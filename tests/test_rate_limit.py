import pytest

from app.llm import rate_limit
from app.llm.rate_limit import LLMRateLimiter
from app.llm.schemas import MathAnswerEvaluationSchema
from app.main import app


@pytest.fixture()
def client():
    from fastapi.testclient import TestClient

    with TestClient(app) as c:
        yield c


def _fake_evaluate(problem, student_answer, reference_correction=None):
    return MathAnswerEvaluationSchema(
        is_correct=True,
        score=10,
        feedback="Parfait.",
        corrected_solution="OK",
    )


def test_rate_limiter_blocks_second_immediate_call(monkeypatch):
    limiter = LLMRateLimiter()
    monkeypatch.setenv("LLM_RATE_LIMIT_SECONDS", "30")

    limiter.check()
    with pytest.raises(Exception) as excinfo:
        limiter.check()
    assert excinfo.value.status_code == 429


def test_rate_limiter_disabled_when_zero(monkeypatch):
    limiter = LLMRateLimiter()
    monkeypatch.setenv("LLM_RATE_LIMIT_SECONDS", "0")

    limiter.check()
    limiter.check()


def test_rate_limiter_allows_after_interval(monkeypatch):
    limiter = LLMRateLimiter()
    monkeypatch.setenv("LLM_RATE_LIMIT_SECONDS", "0.05")

    limiter.check()
    import time

    time.sleep(0.06)
    limiter.check()


def test_rate_limit_env_var_default(monkeypatch):
    monkeypatch.delenv("LLM_RATE_LIMIT_SECONDS", raising=False)
    assert rate_limit.get_rate_limit_seconds() == 30.0


def test_evaluate_endpoint_returns_429_when_limited(client, monkeypatch):
    monkeypatch.setattr("app.routes.evaluate_answer", _fake_evaluate)
    monkeypatch.setenv("LLM_RATE_LIMIT_SECONDS", "30")
    rate_limit.llm_rate_limiter.reset()

    first = client.post(
        "/api/evaluate",
        json={"problem": "1+1", "student_answer": "2"},
    )
    assert first.status_code == 200

    second = client.post(
        "/api/evaluate",
        json={"problem": "1+1", "student_answer": "2"},
    )
    assert second.status_code == 429
    assert "requête" in second.json()["detail"]


def test_evaluate_endpoint_no_api_key_header_accepted(client, monkeypatch):
    monkeypatch.setattr("app.routes.evaluate_answer", _fake_evaluate)
    monkeypatch.setenv("LLM_RATE_LIMIT_SECONDS", "30")
    rate_limit.llm_rate_limiter.reset()

    response = client.post(
        "/api/evaluate",
        json={"problem": "1+1", "student_answer": "2"},
        headers={"X-Mistral-API-Key": "whatever"},
    )
    assert response.status_code == 200
