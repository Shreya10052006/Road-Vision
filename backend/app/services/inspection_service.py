"""Business logic for creating and reading inspections.

Route handlers stay thin (parse request -> call a service function -> return
a schema); everything that touches the DB or has a rule attached to it
(ID generation, upload validation, status transitions) lives here so it has
one place to be tested and one place to change.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.ids import next_inspection_public_id
from app.db.models import Inspection, InspectionStatus, SourceType
from app.schemas.inspection import InspectionCreate

settings = get_settings()


class InvalidUploadError(Exception):
    """Raised for a malformed/unsupported upload. Routes translate this to
    a 400, keeping the actual validation rule here rather than in the route."""


def _generate_public_id(db: Session) -> str:
    count = db.scalar(select(func.count()).select_from(Inspection)) or 0
    return next_inspection_public_id(count)


def create_live_inspection(db: Session, payload: InspectionCreate) -> Inspection:
    inspection = Inspection(
        public_id=_generate_public_id(db),
        title=payload.title,
        source_type=SourceType.live,
        road=payload.road,
        area=payload.area,
        city=payload.city,
        ward=payload.ward,
        inspector_name=payload.inspector_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        frame_sample_rate=payload.frame_sample_rate,
        status=InspectionStatus.pending,
    )
    db.add(inspection)
    db.commit()
    db.refresh(inspection)
    return inspection


def validate_upload(file: UploadFile) -> None:
    if not file.filename:
        raise InvalidUploadError("Uploaded file has no filename.")
    suffix = Path(file.filename).suffix.lower()
    if suffix not in settings.allowed_video_extensions:
        allowed = ", ".join(settings.allowed_video_extensions)
        raise InvalidUploadError(f"Unsupported file type '{suffix}'. Allowed types: {allowed}.")


def save_upload(db: Session, file: UploadFile, payload: InspectionCreate) -> Inspection:
    """Save the uploaded file to disk and create its Inspection record.

    Deliberately does NOT touch OpenCV/YOLO/Random Forest — this is Step 6's
    boundary: receive, validate, persist, and hand back an ID. The future
    InspectionProcessor (see app/ml/pipeline.py) is what will pick this
    inspection up and actually run the CV/ML pipeline against it.
    """
    validate_upload(file)

    public_id = _generate_public_id(db)
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename).suffix.lower()
    dest_path = settings.upload_dir / f"{public_id}{suffix}"

    try:
        with dest_path.open("wb") as out:
            shutil.copyfileobj(file.file, out)
    except OSError as exc:  # disk full, permissions, etc.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to save upload: {exc}"
        ) from exc
    finally:
        file.file.close()

    inspection = Inspection(
        public_id=public_id,
        title=payload.title,
        source_type=SourceType.upload,
        original_filename=file.filename,
        file_path=str(dest_path),
        road=payload.road,
        area=payload.area,
        city=payload.city,
        ward=payload.ward,
        inspector_name=payload.inspector_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        frame_sample_rate=payload.frame_sample_rate,
        status=InspectionStatus.pending,
    )
    db.add(inspection)
    db.commit()
    db.refresh(inspection)
    return inspection


def get_inspection_by_public_id(db: Session, public_id: str) -> Inspection | None:
    return db.scalar(select(Inspection).where(Inspection.public_id == public_id))


def get_inspection_or_404(db: Session, public_id: str) -> Inspection:
    inspection = get_inspection_by_public_id(db, public_id)
    if inspection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inspection '{public_id}' not found.")
    return inspection


def list_inspections(
    db: Session,
    *,
    source_type: SourceType | None = None,
    status_filter: InspectionStatus | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Inspection], int]:
    query = select(Inspection)
    if source_type is not None:
        query = query.where(Inspection.source_type == source_type)
    if status_filter is not None:
        query = query.where(Inspection.status == status_filter)
    if search:
        like = f"%{search}%"
        query = query.where((Inspection.public_id.ilike(like)) | (Inspection.road.ilike(like)))

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    query = query.order_by(Inspection.created_at.desc()).limit(limit).offset(offset)
    items = list(db.scalars(query).all())
    return items, total


def delete_inspection(db: Session, public_id: str) -> None:
    inspection = get_inspection_or_404(db, public_id)
    if inspection.file_path:
        Path(inspection.file_path).unlink(missing_ok=True)
    db.delete(inspection)
    db.commit()


def to_read_dict(inspection: Inspection) -> dict:
    """Map the ORM row to the InspectionRead schema's field names. Written
    by hand rather than via from_attributes because the schema's `id`
    field is the human-readable `public_id`, not the DB primary key."""
    return {
        "id": inspection.public_id,
        "title": inspection.title,
        "source_type": inspection.source_type,
        "data_origin": inspection.data_origin,
        "road": inspection.road,
        "area": inspection.area,
        "city": inspection.city,
        "ward": inspection.ward,
        "inspector_name": inspection.inspector_name,
        "latitude": inspection.latitude,
        "longitude": inspection.longitude,
        "status": inspection.status,
        "frame_sample_rate": inspection.frame_sample_rate,
        "frames_processed": inspection.frames_processed,
        "total_detections": inspection.total_detections,
        "duration_seconds": inspection.duration_seconds,
        "road_health_score": inspection.road_health_score,
        "original_filename": inspection.original_filename,
        "error_message": inspection.error_message,
        "created_at": inspection.created_at,
        "updated_at": inspection.updated_at,
        "completed_at": inspection.completed_at,
    }
