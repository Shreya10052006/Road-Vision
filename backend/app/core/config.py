"""
Application configuration.

Reads from environment variables (with sensible local-dev defaults) via
pydantic-settings, so nothing here needs to be hard-coded when the app
eventually moves beyond a single developer's machine.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # .../backend


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App ---
    app_name: str = "RoadVision API"
    api_prefix: str = "/api"
    environment: str = "development"

    # --- Database ---
    # SQLite for development. A single env var swap (e.g. to a postgres:// DSN)
    # is all SQLAlchemy needs later; no other code changes required.
    database_url: str = f"sqlite:///{BASE_DIR / 'roadvision.db'}"

    # --- Uploads ---
    upload_dir: Path = BASE_DIR / "uploads"
    max_upload_size_mb: int = 500
    allowed_video_extensions: tuple[str, ...] = (".mp4", ".mov", ".avi")

    # --- ML models ---
    # The project-level models/ directory (RoadVision/models), one level above
    # backend/. Drop the trained YOLO checkpoint in there as best.pt and
    # nothing else needs changing. All of these are env-overridable.
    models_dir: Path = BASE_DIR.parent / "models"
    yolo_model_path: Path = BASE_DIR.parent / "models" / "best.pt"
    priority_model_path: Path = BASE_DIR.parent / "models" / "priority_rf.joblib"

    # Detector thresholds (see CV_Pipeline.md §4.4).
    detection_conf_threshold: float = 0.25
    detection_iou_threshold: float = 0.45

    # --- CORS ---
    # The Next.js frontend's local dev origins. Kept as an explicit allowlist
    # rather than "*" even in development, per the project's CORS rule.
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
