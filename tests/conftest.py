import os

import pgserver
import pytest

_server = pgserver.get_server(os.environ.get("PGSERVER_DATA", "/tmp/pgdata_test"))
_uri = _server.get_uri()


@pytest.fixture(autouse=True)
def disable_llm_rate_limit(monkeypatch):
    from app.llm import rate_limit

    monkeypatch.setenv("LLM_RATE_LIMIT_SECONDS", "0")
    rate_limit.llm_rate_limiter.reset()
    yield
    rate_limit.llm_rate_limiter.reset()


@pytest.fixture(autouse=True)
def postgres_db():
    from app.database import db

    db.configure(_uri)
    with db.get_connection() as conn:
        conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    db.init_db()
    yield
