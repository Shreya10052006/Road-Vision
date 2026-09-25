from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.analytics import AnalyticsResponse
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("", response_model=AnalyticsResponse)
def get_analytics(
    days: int | None = Query(default=None, ge=1, le=3650, description="Only inspections from the last N days"),
    road: str | None = Query(default=None),
    ward: str | None = Query(default=None),
    damage_type: str | None = Query(default=None, description="crack | pothole | surface_erosion"),
    priority: str | None = Query(default=None, description="P1 | P2 | P3 | P4"),
    origin: str | None = Query(default=None, description="demo | real"),
    db: Session = Depends(get_db),
) -> AnalyticsResponse:
    """Analytics aggregates. With no parameters this covers every persisted
    inspection — seeded demonstration records and real pipeline output alike."""
    return AnalyticsResponse(
        **analytics_service.analytics_summary(
            db, days=days, road=road, ward=ward, damage_type=damage_type,
            priority=priority, origin=origin,
        )
    )
