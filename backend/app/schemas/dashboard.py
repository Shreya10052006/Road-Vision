"""Dashboard schemas.

These deliberately do NOT include "vs yesterday" deltas the way the
frontend's mock DashboardStats does — a real delta requires real historical
data to compare against, and fabricating one would violate the "don't
fabricate ML/AI results" rule just as much as a fake detection would. Once
there's enough real data, deltas can be computed honestly and added here;
until then, absence is more honest than a placeholder.
"""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas.inspection import InspectionRead


class DamageTypeCount(BaseModel):
    damage_type: str
    count: int


class PriorityCount(BaseModel):
    priority: str
    count: int


class HealthBand(BaseModel):
    label: str
    percentage: float
    color: str


class DashboardStats(BaseModel):
    # Overall (all completed inspections), see services/road_health.py.
    road_health_score: float | None = None
    road_health_distribution: list[HealthBand] = []
    total_inspections_today: int
    total_damages_today: int
    critical_p1_today: int
    roads_inspected_today: int
    average_road_health_score: float | None
    damage_by_type: list[DamageTypeCount]
    damage_by_priority: list[PriorityCount]


class RecentInspectionsResponse(BaseModel):
    items: list[InspectionRead]


class AlertRead(BaseModel):
    """An alert derived from a P1/P2/P3 detection. Empty until real
    detections with a priority exist — see the alert-generation rule in
    the Database Design document (this reads live from `detections`
    rather than a separate `alerts` table, for simplicity at this stage)."""

    id: str
    inspection_id: str
    detection_id: str
    priority: str
    title: str
    road: str | None
    area: str | None
    created_at: str


class DailyTrendPoint(BaseModel):
    date: str
    total: int
    p1: int
    p2: int
    p3: int
    p4: int


class TrendsResponse(BaseModel):
    daily: list[DailyTrendPoint]
