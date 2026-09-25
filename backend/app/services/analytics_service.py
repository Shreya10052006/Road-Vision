"""Aggregation queries shared by the dashboard and analytics routes.

Everything here reads real rows and does real arithmetic on them — no
synthetic numbers. On a fresh database (no inspections processed yet) these
functions correctly return zeros/empty lists rather than sample data; an
empty dashboard is the honest state for a system whose ML pipeline hasn't
run yet.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Detection, Inspection, InspectionStatus
from app.services import road_health


def _today_bounds() -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    start = datetime.combine(now.date(), datetime.min.time(), tzinfo=timezone.utc)
    end = datetime.combine(now.date(), datetime.max.time(), tzinfo=timezone.utc)
    return start, end


def dashboard_stats(db: Session) -> dict:
    start, end = _today_bounds()

    todays_inspections = list(
        db.scalars(select(Inspection).where(Inspection.created_at.between(start, end))).all()
    )
    inspection_ids = [i.id for i in todays_inspections]

    todays_detections: list[Detection] = []
    if inspection_ids:
        todays_detections = list(
            db.scalars(select(Detection).where(Detection.inspection_id.in_(inspection_ids))).all()
        )

    p1_count = sum(1 for d in todays_detections if d.priority == "P1")

    scored = [i.road_health_score for i in todays_inspections if i.road_health_score is not None]
    avg_health = round(sum(scored) / len(scored), 1) if scored else None

    type_counts: dict[str, int] = {}
    for d in todays_detections:
        if d.damage_type:
            type_counts[d.damage_type] = type_counts.get(d.damage_type, 0) + 1

    priority_counts: dict[str, int] = {}
    for d in todays_detections:
        if d.priority:
            priority_counts[d.priority] = priority_counts.get(d.priority, 0) + 1

    # Overall figures span every completed inspection (seeded demo records and
    # real ones alike), so the health card is meaningful even on a quiet day.
    all_scores = [
        row[0]
        for row in db.execute(
            select(Inspection.road_health_score).where(Inspection.road_health_score.is_not(None))
        ).all()
    ]
    overall_health = round(sum(all_scores) / len(all_scores), 1) if all_scores else None

    return {
        "road_health_score": overall_health,
        "road_health_distribution": road_health.distribution(all_scores),
        "total_inspections_today": len(todays_inspections),
        "total_damages_today": len(todays_detections),
        "critical_p1_today": p1_count,
        "roads_inspected_today": len({i.road for i in todays_inspections if i.road}),
        "average_road_health_score": avg_health,
        "damage_by_type": [{"damage_type": k, "count": v} for k, v in sorted(type_counts.items())],
        "damage_by_priority": [{"priority": k, "count": v} for k, v in sorted(priority_counts.items())],
    }


def active_alerts(db: Session, limit: int = 20) -> list[dict]:
    """An alert is simply a P1/P2/P3 detection, read live rather than
    materialized into a separate table — the simplest thing that can work
    at this stage (see Database Design's fuller `alerts` table for the
    richer version, e.g. aggregate collapsing, once volume justifies it)."""
    query = (
        select(Detection, Inspection)
        .join(Inspection, Detection.inspection_id == Inspection.id)
        .where(Detection.priority.in_(["P1", "P2", "P3"]))
        .order_by(Detection.created_at.desc())
        .limit(limit)
    )
    rows = db.execute(query).all()
    alerts = []
    for detection, inspection in rows:
        alerts.append(
            {
                "id": f"ALERT-{detection.public_id}",
                "inspection_id": inspection.public_id,
                "detection_id": detection.public_id,
                "priority": detection.priority,
                "title": f"{detection.priority} Repair {'Required' if detection.priority == 'P1' else 'Recommended'}",
                "road": inspection.road,
                "area": inspection.area,
                "created_at": detection.created_at.isoformat(),
            }
        )
    return alerts


def daily_trend(db: Session, days: int = 7, *, road: str | None = None, origin: str | None = None) -> list[dict]:
    query = select(Detection)
    if road or origin:
        query = query.join(Inspection, Detection.inspection_id == Inspection.id)
        if road:
            query = query.where(Inspection.road == road)
        if origin:
            query = query.where(Inspection.data_origin == origin)
    detections = list(db.scalars(query).all())
    by_day: dict[date, dict[str, int]] = {}
    for d in detections:
        day = d.created_at.date()
        bucket = by_day.setdefault(day, {"total": 0, "P1": 0, "P2": 0, "P3": 0, "P4": 0})
        bucket["total"] += 1
        if d.priority in bucket:
            bucket[d.priority] += 1

    ordered_days = sorted(by_day.keys())[-days:]
    return [
        {
            "date": day.isoformat(),
            "total": by_day[day]["total"],
            "p1": by_day[day]["P1"],
            "p2": by_day[day]["P2"],
            "p3": by_day[day]["P3"],
            "p4": by_day[day]["P4"],
        }
        for day in ordered_days
    ]


def analytics_summary(
    db: Session,
    *,
    days: int | None = None,
    road: str | None = None,
    ward: str | None = None,
    damage_type: str | None = None,
    priority: str | None = None,
    origin: str | None = None,
) -> dict:
    """Aggregates for the Analytics page, over real rows only.

    Every filter is optional and applies to the same underlying tables the
    Dashboard, History and Map read — there is no separate analytics store.
    Seeded demonstration records and real pipeline output are included together
    unless `origin` narrows it.
    """
    inspection_query = select(Inspection)
    if road:
        inspection_query = inspection_query.where(Inspection.road == road)
    if ward:
        inspection_query = inspection_query.where(Inspection.ward == ward)
    if origin:
        inspection_query = inspection_query.where(Inspection.data_origin == origin)
    if days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        inspection_query = inspection_query.where(Inspection.created_at >= cutoff)

    inspections = list(db.scalars(inspection_query).all())
    inspection_ids = [i.id for i in inspections]

    detections: list[Detection] = []
    if inspection_ids:
        detection_query = select(Detection).where(Detection.inspection_id.in_(inspection_ids))
        if damage_type:
            detection_query = detection_query.where(Detection.damage_type == damage_type)
        if priority:
            detection_query = detection_query.where(Detection.priority == priority)
        detections = list(db.scalars(detection_query).all())

    p1_damages = sum(1 for d in detections if d.priority == "P1")

    scored = [i.road_health_score for i in inspections if i.road_health_score is not None]
    avg_health = round(sum(scored) / len(scored), 1) if scored else None

    type_counts: dict[str, int] = {}
    priority_counts: dict[str, int] = {}
    per_inspection: dict[int, int] = {}
    for d in detections:
        if d.damage_type:
            type_counts[d.damage_type] = type_counts.get(d.damage_type, 0) + 1
        if d.priority:
            priority_counts[d.priority] = priority_counts.get(d.priority, 0) + 1
        per_inspection[d.inspection_id] = per_inspection.get(d.inspection_id, 0) + 1

    # Road ranking counts the detections actually in scope, not the
    # inspection's stored total, so it agrees with the charts beside it.
    road_counts: dict[str, int] = {}
    for i in inspections:
        if i.road:
            road_counts[i.road] = road_counts.get(i.road, 0) + per_inspection.get(i.id, 0)

    most_affected = sorted(road_counts.items(), key=lambda kv: kv[1], reverse=True)[:6]

    return {
        "kpis": {
            "total_inspections": len(inspections),
            "total_damages": len(detections),
            "p1_damages": p1_damages,
            "average_road_health_score": avg_health,
        },
        "damage_type_distribution": [{"damage_type": k, "count": v} for k, v in sorted(type_counts.items())],
        "priority_distribution": [{"priority": k, "count": v} for k, v in sorted(priority_counts.items())],
        "most_affected_roads": [{"road": k, "count": v} for k, v in most_affected],
    }
