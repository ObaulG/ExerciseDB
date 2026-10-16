import os

import pgserver
import pytest

_server = pgserver.get_server(os.environ.get("PGSERVER_DATA", "/tmp/pgdata_test"))
_uri = _server.get_uri()


@pytest.fixture(autouse=True)
def postgres_db():
    from app.database import db

    db.configure(_uri)
    with db.get_connection() as conn:
        conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    db.init_db()
    yield
