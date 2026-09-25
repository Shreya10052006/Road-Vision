"""
Seed RoadVision's database with demonstration inspections.

    cd backend
    python scripts/seed_demo_data.py            # insert anything missing
    python scripts/seed_demo_data.py --status   # report only, change nothing
    python scripts/seed_demo_data.py --remove   # delete ONLY the DEMO-* records

WHAT THIS IS
------------
These are DEMONSTRATION RECORDS so the dashboard, history, map, analytics,
detection explorer and reports are populated on a fresh install. They are not
measurements, not municipal field data, and not dataset ground truth. Their
priorities follow the same provisional P1-P4 rule taxonomy the real pipeline
uses and are marked priority_source="rule" exactly like real rule-derived
output.

They are written to the SAME SQLite database and the SAME Inspection /
Detection tables as real inspections — there is no demo database, no demo
table, and no separate API. Each one carries data_origin="demo" and a
DEMO-INS-### public id; real pipeline output carries data_origin="real" and
an INSP-YYYY-#### id.

IDEMPOTENCY
-----------
Each demo inspection has a fixed public_id (DEMO-INS-001 …). Before inserting,
the script looks that id up; if it exists it is skipped entirely. Running the
script any number of times therefore produces the same database, and it never
touches, updates or deletes a record it did not create — real inspections are
never at risk.

DETERMINISM
-----------
Every number here is fixed in the table below or derived from it with a seeded
RNG, so the demo data looks the same on every machine and the map markers never
move between page loads.
"""

from __future__ import annotations

import argparse
import random
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Allow `python scripts/seed_demo_data.py` from the backend directory.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.db.database import SessionLocal, init_db  # noqa: E402
from app.db.models import Detection, Inspection, InspectionStatus, SourceType  # noqa: E402
from app.services import road_health  # noqa: E402

DEMO_PREFIX = "DEMO-INS-"
DAMAGE_TYPES = ("crack", "pothole", "surface_erosion")


@dataclass(frozen=True)
class DemoInspection:
    number: int
    title: str
    source: SourceType
    road: str
    area: str
    ward: str
    latitude: float
    longitude: float
    inspector: str
    days_ago: int
    hour: int
    duration_seconds: int
    frames: int
    # Detection counts by priority — chosen to give the dashboard a realistic
    # spread rather than a uniform one.
    p1: int
    p2: int
    p3: int
    p4: int
    # Damage-type mix, as weights over (crack, pothole, surface_erosion).
    mix: tuple[float, float, float]
    filename: str | None = None


# Chennai arterial roads with real coordinates, so the map is plausible.
DEMO_INSPECTIONS: tuple[DemoInspection, ...] = (
    DemoInspection(1, "Morning Patrol — Anna Salai", SourceType.upload, "Anna Salai", "Teynampet", "Ward 108",
                   13.0418, 80.2341, "R. Muthu", 0, 8, 612, 184, 4, 6, 9, 3, (0.30, 0.55, 0.15),
                   "anna_salai_morning.mp4"),
    DemoInspection(2, "GST Road Corridor Survey", SourceType.upload, "GST Road", "Guindy", "Ward 176",
                   13.0067, 80.2206, "R. Muthu", 0, 11, 884, 262, 6, 8, 11, 2, (0.25, 0.60, 0.15),
                   "gst_road_corridor.mp4"),
    DemoInspection(3, "Live Sweep — Poonamallee High Road", SourceType.live, "Poonamallee High Road", "Kilpauk",
                   "Ward 96", 13.0810, 80.2412, "S. Karthik", 1, 9, 430, 96, 2, 5, 8, 4, (0.45, 0.35, 0.20)),
    DemoInspection(4, "OMR Stretch — Perungudi", SourceType.upload, "Old Mahabalipuram Road", "Perungudi",
                   "Ward 184", 12.9611, 80.2440, "A. Priya", 2, 10, 1020, 310, 5, 7, 13, 5, (0.30, 0.50, 0.20),
                   "omr_perungudi.mp4"),
    DemoInspection(5, "ECR Coastal Segment", SourceType.upload, "East Coast Road", "Thiruvanmiyur", "Ward 179",
                   12.9830, 80.2594, "A. Priya", 3, 15, 756, 228, 3, 4, 10, 7, (0.25, 0.35, 0.40),
                   "ecr_thiruvanmiyur.mp4"),
    DemoInspection(6, "Live Sweep — Mount Road Junction", SourceType.live, "Mount Road", "Nandanam", "Ward 114",
                   13.0308, 80.2456, "S. Karthik", 4, 8, 365, 74, 3, 6, 6, 2, (0.35, 0.50, 0.15)),
    DemoInspection(7, "Velachery Main Road Check", SourceType.upload, "Velachery Main Road", "Velachery",
                   "Ward 181", 12.9791, 80.2210, "R. Muthu", 5, 12, 690, 205, 4, 5, 9, 4, (0.40, 0.40, 0.20),
                   "velachery_main.mp4"),
    DemoInspection(8, "Spot Check — Adyar Bridge Approach", SourceType.upload, "Sardar Patel Road", "Adyar",
                   "Ward 170", 13.0067, 80.2570, "M. Vignesh", 6, 16, 180, 1, 2, 3, 4, 1, (0.30, 0.55, 0.15),
                   "adyar_bridge_spot.jpg"),
    DemoInspection(9, "Ambattur Industrial Estate Road", SourceType.upload, "Ambattur Industrial Estate Road",
                   "Ambattur", "Ward 84", 13.0983, 80.1614, "M. Vignesh", 8, 9, 940, 281, 7, 9, 12, 3,
                   (0.20, 0.60, 0.20), "ambattur_estate.mp4"),
    DemoInspection(10, "Live Sweep — T. Nagar Market Loop", SourceType.live, "Usman Road", "T. Nagar", "Ward 133",
                    13.0418, 80.2341, "S. Karthik", 10, 10, 520, 118, 5, 8, 7, 1, (0.30, 0.55, 0.15)),
    DemoInspection(11, "Porur Junction Approach", SourceType.upload, "Mount Poonamallee Road", "Porur", "Ward 145",
                    13.0374, 80.1575, "A. Priya", 13, 11, 810, 243, 3, 6, 11, 6, (0.35, 0.40, 0.25),
                    "porur_junction.mp4"),
    DemoInspection(12, "Spot Check — Besant Nagar Beach Road", SourceType.upload, "Beach Road", "Besant Nagar",
                    "Ward 178", 12.9986, 80.2669, "M. Vignesh", 16, 17, 150, 1, 1, 2, 5, 4, (0.25, 0.30, 0.45),
                    "besant_nagar_spot.jpg"),
)


def _pick_type(rng: random.Random, mix: tuple[float, float, float]) -> str:
    return rng.choices(DAMAGE_TYPES, weights=mix, k=1)[0]


def _confidence(rng: random.Random, priority: str) -> float:
    """Plausible detector confidence — higher tiers tend to be clearer defects."""
    base = {"P1": (0.72, 0.94), "P2": (0.61, 0.88), "P3": (0.44, 0.79), "P4": (0.28, 0.62)}[priority]
    return round(rng.uniform(*base), 4)


def _build_detections(spec: DemoInspection, inspection: Inspection, rng: random.Random) -> list[Detection]:
    detections: list[Detection] = []
    plan = [("P1", spec.p1), ("P2", spec.p2), ("P3", spec.p3), ("P4", spec.p4)]
    index = 0

    for priority, count in plan:
        for _ in range(count):
            index += 1
            damage_type = _pick_type(rng, spec.mix)
            confidence = _confidence(rng, priority)

            # Geometry consistent with the priority tier, in a 1280x720 frame.
            area_ratio = {"P1": rng.uniform(0.18, 0.42), "P2": rng.uniform(0.09, 0.20),
                          "P3": rng.uniform(0.03, 0.10), "P4": rng.uniform(0.01, 0.04)}[priority]
            aspect = round(rng.uniform(2.2, 5.5) if damage_type == "crack" else rng.uniform(0.7, 1.6), 3)
            box_area = area_ratio * 1280 * 720
            width = min(1200.0, (box_area * aspect) ** 0.5)
            height = max(12.0, box_area / max(width, 1.0))
            x = rng.uniform(0, max(1.0, 1280 - width))
            y = rng.uniform(120, max(130.0, 720 - height))
            position_y = round((y + height / 2) / 720, 4)

            frame_number = rng.randint(0, max(1, spec.frames))
            seconds = int(frame_number / 2) if spec.frames > 1 else 0

            detections.append(
                Detection(
                    public_id=f"{inspection.public_id}-D{index:03d}",
                    inspection_id=inspection.id,
                    frame_number=frame_number,
                    frame_timestamp=f"{seconds // 3600:02d}:{(seconds % 3600) // 60:02d}:{seconds % 60:02d}",
                    damage_type=damage_type,
                    confidence=confidence,
                    bbox_x=round(x, 2),
                    bbox_y=round(y, 2),
                    bbox_width=round(width, 2),
                    bbox_height=round(height, 2),
                    feature_bbox_area_ratio=round(area_ratio, 4),
                    feature_aspect_ratio=aspect,
                    feature_frame_damage_count=rng.randint(1, 5),
                    feature_frame_damage_density=round(min(0.95, area_ratio * rng.uniform(1.0, 2.2)), 4),
                    feature_detector_confidence=confidence,
                    feature_frame_position_y=position_y,
                    priority=priority,
                    # Provisional rule-derived priority, exactly as the real
                    # pipeline records it. Never presented as a model output.
                    priority_source="rule",
                    priority_confidence=None,
                    model_version=None,
                    # Spread markers slightly around the inspection's pin so the
                    # map shows a cluster rather than one stacked point. Derived
                    # from the seeded RNG, so they never move between loads.
                    latitude=round(inspection.latitude + rng.uniform(-0.0035, 0.0035), 6),
                    longitude=round(inspection.longitude + rng.uniform(-0.0035, 0.0035), 6),
                    created_at=inspection.created_at,
                )
            )
    return detections


def seed(db, verbose: bool = True) -> tuple[int, int, int]:
    """Insert any missing demo inspections. Returns (created, skipped, detections)."""
    created = skipped = detection_total = 0
    now = datetime.now(timezone.utc)

    for spec in DEMO_INSPECTIONS:
        public_id = f"{DEMO_PREFIX}{spec.number:03d}"

        if db.scalar(select(Inspection).where(Inspection.public_id == public_id)) is not None:
            skipped += 1
            if verbose:
                print(f"  = {public_id} already present — skipped")
            continue

        # Deterministic per-record RNG: same data on every machine, every run.
        rng = random.Random(1000 + spec.number)

        if spec.days_ago == 0:
            # Today's demo records are placed a few hours BEHIND the current
            # time, never at a fixed clock hour — otherwise a demo record could
            # sit in the future and outrank a real inspection run during the
            # demo itself. Real inspections must always surface at the top of
            # Recent Inspections.
            created_at = now - timedelta(hours=2 + spec.number, minutes=(spec.number * 7) % 60)
        else:
            created_at = (now - timedelta(days=spec.days_ago)).replace(
                hour=spec.hour, minute=(spec.number * 7) % 60, second=0, microsecond=0
            )

        inspection = Inspection(
            public_id=public_id,
            title=spec.title,
            source_type=spec.source,
            data_origin="demo",
            original_filename=spec.filename,
            file_path=None,
            frame_sample_rate=2,
            road=spec.road,
            area=spec.area,
            city="Chennai",
            ward=spec.ward,
            inspector_name=spec.inspector,
            latitude=spec.latitude,
            longitude=spec.longitude,
            status=InspectionStatus.completed,
            frames_processed=spec.frames,
            total_detections=spec.p1 + spec.p2 + spec.p3 + spec.p4,
            duration_seconds=spec.duration_seconds,
            created_at=created_at,
            updated_at=created_at,
            completed_at=created_at + timedelta(seconds=spec.duration_seconds),
        )
        db.add(inspection)
        db.flush()  # assign the primary key for the detections' FK

        detections = _build_detections(spec, inspection, rng)
        db.add_all(detections)

        # Same Road Health Score function the live and video pipelines use.
        inspection.road_health_score = road_health.score_from_priorities(
            [d.priority for d in detections]
        )

        created += 1
        detection_total += len(detections)
        if verbose:
            print(
                f"  + {public_id}  {spec.road:<32} {spec.source.value:<6} "
                f"{len(detections):>3} detections  health {inspection.road_health_score:.0f}"
            )

    db.commit()
    return created, skipped, detection_total


def backfill_missing_health_scores(db) -> int:
    """Give a Road Health Score to any inspection that has none.

    Real inspections recorded before the score existed would otherwise be
    invisible to the dashboard's health card. This only fills NULLs — an
    existing score is never overwritten, and no other field is touched.
    """
    filled = 0
    for inspection in db.scalars(select(Inspection).where(Inspection.road_health_score.is_(None))).all():
        priorities = [d.priority for d in inspection.detections]
        if not priorities:
            continue
        inspection.road_health_score = road_health.score_from_priorities(priorities)
        filled += 1
    db.commit()
    return filled


def status(db) -> None:
    demo = list(db.scalars(select(Inspection).where(Inspection.public_id.like(f"{DEMO_PREFIX}%"))).all())
    real = list(db.scalars(select(Inspection).where(~Inspection.public_id.like(f"{DEMO_PREFIX}%"))).all())
    print(f"demo inspections : {len(demo)} / {len(DEMO_INSPECTIONS)}")
    print(f"real inspections : {len(real)}")
    for i in real:
        print(f"    {i.public_id}  {i.source_type.value:<6} {i.status.value:<10} {i.total_detections} detections")


def remove(db) -> int:
    """Delete only the seeded records. Real inspections are never touched."""
    demo = list(db.scalars(select(Inspection).where(Inspection.public_id.like(f"{DEMO_PREFIX}%"))).all())
    for inspection in demo:
        db.delete(inspection)  # detections cascade
    db.commit()
    return len(demo)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed RoadVision demonstration data.")
    parser.add_argument("--status", action="store_true", help="report what is present and exit")
    parser.add_argument("--remove", action="store_true", help="delete only the DEMO-INS-* records")
    args = parser.parse_args()

    init_db()  # creates tables if missing; never drops anything
    db = SessionLocal()
    try:
        if args.status:
            status(db)
            return
        if args.remove:
            print(f"Removed {remove(db)} demo inspections (real inspections untouched).")
            return

        print("Seeding RoadVision demonstration data…")
        created, skipped, detections = seed(db)
        print(
            f"\nDone. {created} inspection(s) created, {skipped} already present, "
            f"{detections} detection(s) inserted."
        )
        filled = backfill_missing_health_scores(db)
        if filled:
            print(f"Filled in a Road Health Score for {filled} inspection(s) that had none.")
        print("These are demonstration records (data_origin='demo'), not field measurements.")
        status(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
