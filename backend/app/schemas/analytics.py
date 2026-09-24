from __future__ import annotations

from pydantic import BaseModel

from app.schemas.dashboard import DamageTypeCount, PriorityCount


class RoadCount(BaseModel):
    road: str
    count: int


class AnalyticsKpis(BaseModel):
    total_inspections: int
    total_damages: int
    p1_damages: int
    average_road_health_score: float | None


class AnalyticsResponse(BaseModel):
    kpis: AnalyticsKpis
    damage_type_distribution: list[DamageTypeCount]
    priority_distribution: list[PriorityCount]
    most_affected_roads: list[RoadCount]
