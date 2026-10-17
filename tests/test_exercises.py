import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def test_create_and_list_exercise(client):
    payload = {
        "name": "Pythagore",
        "text": "Calcule $c$ tel que $c^2 = a^2 + b^2$",
        "type": "Application directe",
        "niveau": "3e",
        "temps_estime": 15,
        "themes": ["Théorème de Pythagore", "Géométrie"],
        "corrections": [{"text": "On a $c = \\sqrt{a^2+b^2}$"}, {"text": "Second corrigé"}],
    }
    response = client.post("/api/exercises", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["exercise"]["name"] == "Pythagore"
    assert data["exercise"]["type"] == "Application directe"
    assert data["exercise"]["niveau"] == "3e"
    assert data["exercise"]["temps_estime"] == 15
    assert set(data["exercise"]["themes"]) == {"Théorème de Pythagore", "Géométrie"}
    assert len(data["exercise"]["corrections"]) == 2
    listing = client.get("/api/exercises").json()
    assert len(listing) == 1
    assert listing[0]["corrections"][0]["text"] == "On a $c = \\sqrt{a^2+b^2}$"
    assert listing[0]["type"] == "Application directe"
    assert listing[0]["niveau"] == "3e"
    assert listing[0]["temps_estime"] == 15
    assert set(listing[0]["themes"]) == {"Théorème de Pythagore", "Géométrie"}


def test_create_exercise_without_optional_fields(client):
    payload = {
        "name": "Exercice simple",
        "text": "Calculer 2 + 2.",
        "corrections": [],
    }
    response = client.post("/api/exercises", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["exercise"]["type"] is None
    assert data["exercise"]["niveau"] is None
    assert data["exercise"]["temps_estime"] is None
    assert data["exercise"]["themes"] == []


def test_get_exercise_not_found(client):
    assert client.get("/api/exercises/999").status_code == 404


def test_exercises_page(client):
    response = client.get("/exercises")
    assert response.status_code == 200
    assert "Extraction d'exercices" in response.text
    assert "Valider et envoyer" in response.text
    assert "Parser" in response.text
    assert "Agent LLM" in response.text


def test_settings_page(client):
    response = client.get("/settings")
    assert response.status_code == 200
    assert "Clé API Mistral" in response.text
    assert "Paramètres" in response.text


def test_extract_accepts_api_key_header(client):
    """L'endpoint d'extraction doit accepter l'en-tête X-Mistral-API-Key sans erreur de validation."""
    response = client.post(
        "/api/exercises/extract",
        json={"raw_text": "Exercice 1. Calculer 2+2."},
        headers={"X-Mistral-API-Key": "fake-key-for-validation-test"},
    )
    # Soit 200 (la clé d'environnement prend le relais), soit 502/503 (erreur LLM)
    assert response.status_code in (200, 502, 503)


def _create_admin_client(client):
    """Crée un utilisateur admin en base et retourne un client authentifié."""
    from app.database import db

    with db.get_connection() as conn:
        conn.execute('INSERT INTO "user" (pseudo, password_hash, is_admin) VALUES (%s, %s, %s)',
                     ("admin", "fake-hash", True))
    # Pas de mot de passe valide : on injecte directement le cookie de session.
    from app import auth

    with db.get_connection() as conn:
        row = conn.execute('SELECT id FROM "user" WHERE pseudo = %s', ("admin",)).fetchone()
    token = auth.create_session(row["id"])
    client.cookies.set(auth.SESSION_COOKIE, token)
    return client


def test_delete_exercise_as_admin(client):
    client.post("/api/exercises", json={"name": "À supprimer", "text": "Énoncé", "corrections": []})
    exercise_id = client.get("/api/exercises").json()[0]["id"]

    _create_admin_client(client)
    response = client.delete(f"/api/exercises/{exercise_id}")
    assert response.status_code == 200
    assert response.json()["status"] == "deleted"
    assert client.get(f"/api/exercises/{exercise_id}").status_code == 404


def test_delete_exercise_forbidden_without_admin(client):
    client.post("/api/exercises", json={"name": "À garder", "text": "Énoncé", "corrections": []})
    exercise_id = client.get("/api/exercises").json()[0]["id"]

    response = client.delete(f"/api/exercises/{exercise_id}")
    assert response.status_code == 403
    # L'exercice doit toujours exister
    assert client.get(f"/api/exercises/{exercise_id}").status_code == 200


def test_delete_exercise_not_found_as_admin(client):
    _create_admin_client(client)
    assert client.delete("/api/exercises/999").status_code == 404
