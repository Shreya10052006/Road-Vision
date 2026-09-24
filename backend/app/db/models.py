"""
SQLAlchemy models.

Kept deliberately small: two tables, matching what the existing frontend
(see lib/types/index.ts) actually needs today, plus the columns that will
hold real YOLO/feature/Random-Forest output once that pipeline exists.

Every ML-dependent column is nullable. Nothing here fabricates a detection,
a damage type, or a priority — those stay NULL until the real pipeline
(see app/ml/) writes them. A frontend or API consumer must treat NULL as
"not yet processed", not as a zero/default value.
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SourceType(str, enum.Enum):
    live = "live"
    upload = "upload"


class InspectionStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class Inspection(Base):
    """One inspection run — a live session or an uploaded video/image set."""

    __tablename__ = "inspections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Human-readable identifier used in URLs/API responses, e.g. "INSP-2026-0001".
    public_id: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)

    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    source_type: Mapped[SourceType] = mapped_column(Enum(SourceType), nullable=False)
    # "real"  — produced by the RoadVision pipeline from an actual image,
    #           video or webcam session.
    # "demo"  — seeded demonstration record (scripts/seed_demo_data.py).
    # Both live in this one table and both are served by the same APIs; the
    # field exists only so a record's origin is never ambiguous.
    data_origin: Mapped[str] = mapped_column(String(10), nullable=False, default="real")

    # --- Upload-mode fields (null for source_type == live) ---
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    frame_sample_rate: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # --- Location / metadata (all optional at creation time) ---
    road: Mapped[str | None] = mapped_column(String(200), nullable=True)
    area: Mapped[str | None] = mapped_column(String(120), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    ward: Mapped[str | None] = mapped_column(String(120), nullable=True)
    inspector_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Processing state ---
    status: Mapped[InspectionStatus] = mapped_column(
        Enum(InspectionStatus), nullable=False, default=InspectionStatus.pending
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # --- Results (populated by the future CV/ML pipeline; NULL/0 until then) ---
    frames_processed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_detections: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Placeholder for the Road Health Score formula (not yet defined — see
    # Dashboard UI Spec's open item). NULL means "not computed", not zero.
    road_health_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    detections: Mapped[list["Detection"]] = relationship(
        back_populates="inspection", cascade="all, delete-orphan"
    )


class Detection(Base):
    """
    One detected road-defect instance within an inspection.

    CV output (damage_type, confidence, bbox), the locked V1 ML feature
    vector, and the Random Forest priority output are all nullable: a row
    can legitimately exist (a frame was processed) before any of those
    stages have run. This phase never fills them with placeholder values.
    """

    __tablename__ = "detections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[str] = mapped_column(String(60), unique=True, index=True, nullable=False)

    inspection_id: Mapped[int] = mapped_column(ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    inspection: Mapped["Inspection"] = relationship(back_populates="detections")

    # --- Frame position (available as soon as a frame is extracted) ---
    frame_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    frame_timestamp: Mapped[str | None] = mapped_column(String(20), nullable=True)  # e.g. "00:13:24"

    # --- CV / YOLO output (NULL until the detector runs) ---
    damage_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    bbox_x: Mapped[float | None] = mapped_column(Float, nullable=True)
    bbox_y: Mapped[float | None] = mapped_column(Float, nullable=True)
    bbox_width: Mapped[float | None] = mapped_column(Float, nullable=True)
    bbox_height: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Locked V1 feature vector (NULL until feature extraction runs) ---
    # See ML_Pipeline.md — these 6 columns are exactly the frozen feature set.
    feature_bbox_area_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    feature_aspect_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    feature_frame_damage_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feature_frame_damage_density: Mapped[float | None] = mapped_column(Float, nullable=True)
    feature_detector_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    feature_frame_position_y: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Random Forest output (NULL until the priority model runs) ---
    priority: Mapped[str | None] = mapped_column(String(4), nullable=True)  # "P1".."P4"
    priority_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    # "rule" = provisional heuristic, "model" = Random Forest prediction. Stored
    # so a rule-derived priority can never be read back as a model output.
    priority_source: Mapped[str | None] = mapped_column(String(10), nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(40), nullable=True)

    # --- Geotag (best-effort; see System Architecture's geotagging note) ---
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Frame image reference, once frames are actually saved to disk ---
    image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
