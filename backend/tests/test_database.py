"""Verifies the DB actually initializes with the expected tables, using the
same engine the `client` fixture's app instance talks to."""

from sqlalchemy import inspect


def test_tables_created(client):
    inspector = inspect(client.db_engine)
    table_names = set(inspector.get_table_names())
    assert "inspections" in table_names
    assert "detections" in table_names
