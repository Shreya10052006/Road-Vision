from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.dashboard import AlertRead, DashboardStats, RecentInspectionsResponse, TrendsResponse
from app.schemas.inspection import InspectionRead
from app.services import analytics_service, inspection_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)) -> DashboardStats:
    return DashboardStats(**analytics_service.dashboard_stats(db))


@router.get("/alerts", response_model=list[AlertRead])
def get_dashboard_alerts(
    limit: int = Query(default=20, ge=1, le=100), db: Session = Depends(get_db)
) -> list[AlertRead]:
    return [AlertRead(**a) for a in analytics_service.active_alerts(db, limit=limit)]


@router.get("/recent-inspections", response_model=RecentInspectionsResponse)
def get_recent_inspections(
    limit: int = Query(default=5, ge=1, le=50), db: Session = Depends(get_db)
) -> RecentInspectionsResponse:
    items, _ = inspection_service.list_inspections(db, limit=limit, offset=0)
    return RecentInspectionsResponse(items=[InspectionRead(**inspection_service.to_read_dict(i)) for i in items])


@router.get("/trends", response_model=TrendsResponse)
def get_dashboard_trends(
    days: int = Query(default=7, ge=1, le=365),
    road: str | None = Query(default=None),
    origin: str | None = Query(default=None, description="demo | real"),
    db: Session = Depends(get_db),
) -> TrendsResponse:
    daily = analytics_service.daily_trend(db, days=days, road=road, origin=origin)
    return TrendsResponse(daily=[{"date": d["date"], "total": d["total"], "p1": d["p1"], "p2": d["p2"], "p3": d["p3"], "p4": d["p4"]} for d in daily])
