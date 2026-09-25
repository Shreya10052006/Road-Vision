from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.detection import DetectionListResponse, DetectionRead
from app.services import detection_service

router = APIRouter(prefix="/detections", tags=["detections"])


@router.get("", response_model=DetectionListResponse)
def list_detections(
    damage_type: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> DetectionListResponse:
    items, total = detection_service.list_detections(
        db, damage_type=damage_type, priority=priority, limit=limit, offset=offset
    )
    return DetectionListResponse(
        items=[
            DetectionRead(**detection_service.to_read_dict(d, d.inspection.public_id)) for d in items
        ],
        total=total,
    )


@router.get("/{detection_id}", response_model=DetectionRead)
def get_detection(detection_id: str, db: Session = Depends(get_db)) -> DetectionRead:
    detection = detection_service.get_detection_or_404(db, detection_id)
    return DetectionRead(**detection_service.to_read_dict(detection, detection.inspection.public_id))
