"""SQLAlchemy engine/session setup, plus the FastAPI dependency that hands
a session to each request and always closes it afterward."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# check_same_thread=False is only needed for SQLite (a single dev DB file
# accessed from multiple request threads); harmless to leave conditional.
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables that don't exist yet, then add any missing columns.

    Nothing is ever dropped or recreated: an existing database keeps every row
    it already had. A real migration tool (Alembic) is the natural next step
    once the schema needs more than additive columns.
    """
    from app.db import models  # noqa: F401  (ensures models are registered on Base)

    Base.metadata.create_all(bind=engine)
    _add_missing_columns()


# Columns added after the first databases were created. SQLite supports
# ALTER TABLE ... ADD COLUMN, which preserves existing rows, so a developer
# with real inspections already recorded keeps them.
_ADDITIVE_COLUMNS: dict[str, dict[str, str]] = {
    "inspections": {"data_origin": "VARCHAR(10) NOT NULL DEFAULT 'real'"},
    "detections": {"priority_source": "VARCHAR(10)"},
}


def _add_missing_columns() -> None:
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table, columns in _ADDITIVE_COLUMNS.items():
            if table not in existing_tables:
                continue
            present = {c["name"] for c in inspector.get_columns(table)}
            for name, ddl in columns.items():
                if name not in present:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
