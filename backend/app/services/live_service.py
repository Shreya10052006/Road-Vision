"""
Live webcam inspection sessions.

The browser samples frames and posts them to POST /api/ml/detect-frame; each
frame goes through the SAME image pipeline the upload endpoint uses. When the
session is stopped, its accumulated per-frame detections are aggregated with
the video module's existing routine and written to the existing Inspection /
Detection tables as source_type = live.

Session state is a plain in-process dict: this is a single-user local demo, so
there is deliberately no Redis, no queue and no background worker. Sessions are
lost on restart, which is correct — an unfinished live session has nothing
worth recovering. Stale sessions are dropped after SESSION_TTL_SECONDS so a
browser tab closed mid-inspection cannot leak memory.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.models import Inspection, InspectionStatus, SourceType
from app.ml.pipeline import ProcessedDetection
from app.ml.video import FrameDetection, VideoConfig, aggregate
from app.services import road_health
from app.services.video_service import next_public_id, persist_damages

SESSION_TTL_SECONDS = 3600
MAX_FRAMES_PER_SESSION = 3000  # ~25 minutes at 2 fps


class LiveSessionError(Exception):
    """Unknown or expired live session."""


@dataclass
class LiveSession:
    id: str
    started_at: float = field(default_factory=time.monotonic)
    last_seen: float = field(default_factory=time.monotonic)
    frame_index: int = 0
    frames: list[FrameDetection] = field(default_factory=list)
    sample_index_of: dict[int, int] = field(default_factory=dict)


_sessions: dict[str, LiveSession] = {}


def _prune() -> None:
    now = time.monotonic()
    for sid in [s for s, sess in _sessions.items() if now - sess.last_seen > SESSION_TTL_SECONDS]:
        _sessions.pop(sid, None)


def start_session() -> LiveSession:
    _prune()
    session = LiveSession(id=uuid.uuid4().hex[:12])
    _sessions[session.id] = session
    return session


def get_session(session_id: str) -> LiveSession:
    session = _sessions.get(session_id)
    if session is None:
        raise LiveSessionError(f"Live session '{session_id}' is unknown or has expired.")
    return session


def record_frame(session_id: str, processed: list[ProcessedDetection]) -> int:
    """Attach one analysed frame's detections to a session. Returns the frame index."""
    session = get_session(session_id)
    session.last_seen = time.monotonic()

    index = session.frame_index
    session.frame_index += 1
    session.sample_index_of[index] = index

    if len(session.frames) < MAX_FRAMES_PER_SESSION:
        elapsed = time.monotonic() - session.started_at
        for detection in processed:
            session.frames.append(
                FrameDetection(frame_number=index, timestamp_seconds=elapsed, processed=detection)
            )
    return index


def discard_session(session_id: str) -> None:
    _sessions.pop(session_id, None)


def finalize_session(db: Session, session_id: str, meta: dict) -> dict:
    """Aggregate the session's detections and save it as a live Inspection.

    Deduplication reuses app.ml.video.aggregate() — the same damage-type +
    IoU/proximity rule the uploaded-video path uses — so one pothole held in
    view across many webcam frames becomes one Detection row, not hundreds.
    """
    session = get_session(session_id)
    elapsed = time.monotonic() - session.started_at

    config = VideoConfig()
    tracks = aggregate(session.frames, session.sample_index_of, config)
    damages = [t.to_dict() for t in tracks]

    inspection = Inspection(
        public_id=next_public_id(db),
        title=meta.get("title") or "Live Inspection",
        source_type=SourceType.live,
        road=meta.get("road"),
        area=meta.get("area"),
        city=meta.get("city"),
        ward=meta.get("ward"),
        inspector_name=meta.get("inspector_name"),
        latitude=meta.get("latitude"),
        longitude=meta.get("longitude"),
        status=InspectionStatus.processing,
        frame_sample_rate=1,
    )
    db.add(inspection)
    db.commit()
    db.refresh(inspection)

    persist_damages(db, inspection, damages)

    inspection.road_health_score = road_health.score_from_priorities(
        [d.get("priority") for d in damages]
    )
    inspection.frames_processed = session.frame_index
    inspection.total_detections = len(damages)
    inspection.duration_seconds = int(elapsed)
    inspection.status = InspectionStatus.completed
    inspection.completed_at = datetime.now(timezone.utc)
    db.commit()

    discard_session(session_id)

    confidences = [f.processed.detection.confidence for f in session.frames]
    by_type: dict[str, int] = {}
    by_priority: dict[str, int] = {}
    for track in tracks:
        by_type[track.damage_type] = by_type.get(track.damage_type, 0) + 1
        by_priority[track.priority] = by_priority.get(track.priority, 0) + 1

    return {
        "inspection_id": inspection.public_id,
        "status": inspection.status.value,
        "duration_seconds": round(elapsed, 1),
        "frames_processed": session.frame_index,
        "summary": {
            "total_detections": len(session.frames),
            "unique_damages": len(damages),
            "counts_by_damage_type": by_type,
            "counts_by_priority": by_priority,
            "average_confidence": round(sum(confidences) / len(confidences), 4) if confidences else 0.0,
            "priority_source": "rule",
        },
        "damages": damages,
    }
