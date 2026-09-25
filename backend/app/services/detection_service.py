"""Read-side logic for detections. There is no write path here yet —
detections are created by the future CV/ML pipeline (app/ml/pipeline.py),
not through this API, so this module is intentionally read-only for now.
"""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Detection, Inspection


def get_detection_by_public_id(db: Session, public_id: str) -> Detection | None:
    return db.scalar(select(Detection).where(Detection.public_id == public_id))


def get_detection_or_404(db: Session, public_id: str) -> Detection:
    detection = get_detection_by_public_id(db, public_id)
    if detection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Detection '{public_id}' not found.")
    return detection


def list_detections(
    db: Session,
    *,
    inspection_public_id: str | None = None,
    damage_type: str | None = None,
    priority: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[Detection], int]:
    query = select(Detection).join(Inspection)
    if inspection_public_id is not None:
        query = query.where(Inspection.public_id == inspection_public_id)
    if damage_type is not None:
        query = query.where(Detection.damage_type == damage_type)
    if priority is not None:
        query = query.where(Detection.priority == priority)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    query = query.order_by(Detection.created_at.desc()).limit(limit).offset(offset)
    items = list(db.scalars(query).all())
    return items, total


def list_map_detections(
    db: Session,
    *,
    priority: str | None = None,
    damage_type: str | None = None,
    origin: str | None = None,
    road: str | None = None,
) -> list[Detection]:
    """Only detections that are both geotagged AND prioritized are meaningful
    on the Damage Map — an un-prioritized point has no color to render with,
    and an un-geotagged one has no coordinates. Both are filtered out here
    rather than defaulted, per the no-fabrication rule. A record excluded here
    still appears in History, Analytics and the Detection Explorer.

    Coordinates are read from the stored columns only: nothing is geocoded from
    a road name and nothing is generated.
    """
    query = (
        select(Detection)
        .join(Inspection, Detection.inspection_id == Inspection.id)
        .where(
            Detection.latitude.is_not(None),
            Detection.longitude.is_not(None),
            Detection.priority.is_not(None),
        )
    )
    if priority is not None:
        query = query.where(Detection.priority == priority)
    if damage_type is not None:
        query = query.where(Detection.damage_type == damage_type)
    if origin is not None:
        query = query.where(Inspection.data_origin == origin)
    if road is not None:
        query = query.where(Inspection.road == road)
    return list(db.scalars(query).all())


def to_read_dict(detection: Detection, inspection_public_id: str) -> dict:
    """Map the ORM row to the DetectionRead schema's field names, nesting
    the flat feature_* columns into the `features` sub-object the schema
    (and the ML Pipeline document) expects."""
    return {
        "id": detection.public_id,
        "inspection_id": inspection_public_id,
        "frame_number": detection.frame_number,
        "frame_timestamp": detection.frame_timestamp,
        "road": detection.inspection.road if detection.inspection else None,
        "area": detection.inspection.area if detection.inspection else None,
        "damage_type": detection.damage_type,
        "confidence": detection.confidence,
        "bbox_x": detection.bbox_x,
        "bbox_y": detection.bbox_y,
        "bbox_width": detection.bbox_width,
        "bbox_height": detection.bbox_height,
        "priority": detection.priority,
        "priority_confidence": detection.priority_confidence,
        "priority_source": detection.priority_source,
        "model_version": detection.model_version,
        "features": {
            "bbox_area_ratio": detection.feature_bbox_area_ratio,
            "aspect_ratio": detection.feature_aspect_ratio,
            "frame_damage_count": detection.feature_frame_damage_count,
            "frame_damage_density": detection.feature_frame_damage_density,
            "detector_confidence": detection.feature_detector_confidence,
            "frame_position_y": detection.feature_frame_position_y,
        },
        "latitude": detection.latitude,
        "longitude": detection.longitude,
        "image_path": detection.image_path,
        "is_read": detection.is_read,
        "created_at": detection.created_at,
    }
