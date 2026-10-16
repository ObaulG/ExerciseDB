import os

import pytest
from fastapi.testclient import TestClient

from app.database import db
from app.main import app


@pytest.fixture()
def client():
    db.DB_PATH = db.DB_PATH.with_name("test_exercises.db")
    db.init_db()
    with TestClient(app) as c:
        yield c
    os.remove(db.DB_PATH)


def test_create_and_list_exercise(client):
    payload = {
        "name": "Pythagore",
        "text": "Calcule $c$ tel que $c^2 = a^2 + b^2$",
        "corrections": [{"text": "On a $c = \\sqrt{a^2+b^2}$"}, {"text": "Second corrigé"}],
    }
    response = client.post("/api/exercises", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["exercise"]["name"] == "Pythagore"
    assert len(data["exercise"]["corrections"]) == 2

    listing = client.get("/api/exercises").json()
    assert len(listing) == 1
    assert listing[0]["corrections"][0]["text"] == "On a $c = \\sqrt{a^2+b^2}$"


def test_get_exercise_not_found(client):
    assert client.get("/api/exercises/999").status_code == 404


def test_exercises_page(client):
    response = client.get("/exercises")
    assert response.status_code == 200
    assert "Import d'exercices" in response.text
