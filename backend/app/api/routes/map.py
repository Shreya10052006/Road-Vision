from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.detection import MapDetectionRead
from app.services import detection_service

router = APIRouter(prefix="/map", tags=["map"])


@router.get("/detections", response_model=list[MapDetectionRead])
def get_map_detections(
    priority: str | None = Query(default=None, description="P1 | P2 | P3 | P4"),
    damage_type: str | None = Query(default=None, description="crack | pothole | surface_erosion"),
    origin: str | None = Query(default=None, description="demo | real"),
    road: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[MapDetectionRead]:
    """Geotagged, prioritized detections for the Damage Map.

    Seeded demonstration records and real pipeline output are returned together
    by default; `origin` narrows to one or the other. Every coordinate comes
    straight from the stored latitude/longitude columns.
    """
    detections = detection_service.list_map_detections(
        db, priority=priority, damage_type=damage_type, origin=origin, road=road
    )
    return [
        MapDetectionRead(
            id=d.public_id,
            inspection_id=d.inspection.public_id,
            latitude=d.latitude,
            longitude=d.longitude,
            road=d.inspection.road,
            area=d.inspection.area,
            ward=d.inspection.ward,
            damage_type=d.damage_type,
            priority=d.priority,
            confidence=d.confidence,
            data_origin=d.inspection.data_origin,
        )
        for d in detections
    ]
