"""Shared pytest fixtures.

Tests run against an isolated, file-based SQLite database (created fresh
per test session and torn down after), not the developer's roadvision.db —
running the test suite never touches real data.
"""

from __future__ import annotations

import os
import tempfile
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("ENVIRONMENT", "test")


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    # Fresh DB file per test so tests never leak state into each other.
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)

    test_engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    from app.db.database import Base, get_db
    from app.main import app

    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        test_client.db_engine = test_engine  # exposed for tests that want to introspect the schema
        yield test_client

    app.dependency_overrides.clear()
    test_engine.dispose()
    try:
        os.remove(db_path)
    except OSError:
        pass
