import os

import pytest
from fastapi.testclient import TestClient

from app.database import db
from app.main import app


@pytest.fixture()
def client():
    db.DB_PATH = db.DB_PATH.with_name("test_auth.db")
    db.init_db()
    with TestClient(app) as c:
        yield c
    os.remove(db.DB_PATH)


def test_register_login_logout_flow(client):
    response = client.post("/api/auth/register", json={"pseudo": "alice", "password": "secret123"})
    assert response.status_code == 201

    duplicate = client.post("/api/auth/register", json={"pseudo": "ALICE", "password": "secret123"})
    assert duplicate.status_code == 409

    login = client.post("/api/auth/login", json={"pseudo": "alice", "password": "secret123"})
    assert login.status_code == 200
    assert login.json()["pseudo"] == "alice"

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["pseudo"] == "alice"

    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={"pseudo": "bob", "password": "secret123"})
    response = client.post("/api/auth/login", json={"pseudo": "bob", "password": "wrong-password"})
    assert response.status_code == 401


def test_short_password_rejected(client):
    response = client.post("/api/auth/register", json={"pseudo": "carl", "password": "abc"})
    assert response.status_code == 422
