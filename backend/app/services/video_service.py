"""
Video inspection orchestration: upload -> process -> persist -> summary.

Uses the existing Inspection and Detection models and the existing public-id
helpers; it does not introduce a second storage mechanism. Processing itself
lives in app/ml/video.py, which has no database dependency.

Each aggregated damage (not each raw per-frame box) becomes one Detection
row, so the History and Inspection Details pages show unique defects rather
than the same pothole a hundred times. The raw per-frame detections are
returned in the API response for the demo view but are not persisted — that
would multiply rows without adding anything those pages display.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.ids import next_detection_public_id, next_inspection_public_id
from app.db.models import Detection, Inspection, InspectionStatus, SourceType
from app.ml.video import VideoConfig, VideoInspectionProcessor, VideoProcessingError
from app.services import road_health

logger = logging.getLogger("roadvision.video")
settings = get_settings()


def next_public_id(db: Session) -> str:
    count = db.scalar(select(func.count()).select_from(Inspection)) or 0
    return next_inspection_public_id(count)


def create_inspection(db: Session, *, filename: str, file_path: Path, meta: dict) -> Inspection:
    inspection = Inspection(
        public_id=next_public_id(db),
        title=meta.get("title"),
        source_type=SourceType.upload,
        original_filename=filename,
        file_path=str(file_path),
        road=meta.get("road"),
        area=meta.get("area"),
        city=meta.get("city"),
        ward=meta.get("ward"),
        inspector_name=meta.get("inspector_name"),
        latitude=meta.get("latitude"),
        longitude=meta.get("longitude"),
        status=InspectionStatus.processing,
    )
    db.add(inspection)
    db.commit()
    db.refresh(inspection)
    return inspection


def process_and_persist(
    db: Session,
    inspection: Inspection,
    video_path: str,
    processor,
    config: VideoConfig | None = None,
) -> dict:
    """Run the video through the pipeline and write the results.

    On failure the inspection is marked `failed` with the reason recorded,
    rather than left stuck in `processing`.
    """
    frames_dir = settings.upload_dir / "frames"
    try:
        result = VideoInspectionProcessor(processor, config).process(
            video_path, output_dir=frames_dir, public_id=inspection.public_id
        )
    except VideoProcessingError:
        inspection.status = InspectionStatus.failed
        inspection.error_message = "Video could not be processed."
        db.commit()
        raise
    except Exception as exc:
        inspection.status = InspectionStatus.failed
        inspection.error_message = str(exc)[:500]
        db.commit()
        logger.exception("Unexpected failure processing %s", inspection.public_id)
        raise

    video = result["video"]
    summary = result["summary"]

    persist_damages(db, inspection, result["damages"])

    inspection.road_health_score = road_health.score_from_priorities(
        [d.get("priority") for d in result["damages"]]
    )
    inspection.frames_processed = video["processed_frames"]
    inspection.frame_sample_rate = video["frame_stride"]
    inspection.total_detections = summary["unique_damages"]
    inspection.duration_seconds = int(video["duration_seconds"])
    inspection.status = InspectionStatus.completed
    inspection.completed_at = datetime.now(timezone.utc)
    db.commit()

    result["inspection_id"] = inspection.public_id
    result["status"] = inspection.status.value
    return result


def save_video_upload(file, public_id_hint: str) -> Path:
    """Stream the upload to disk under the configured upload directory."""
    import shutil

    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "").suffix.lower()
    dest = settings.upload_dir / f"{public_id_hint}{suffix}"
    with dest.open("wb") as out:
        shutil.copyfileobj(file.file, out)
    return dest


def persist_damages(db: Session, inspection: Inspection, damages: list[dict]) -> None:
    """Write one Detection row per aggregated damage.

    Shared by the uploaded-video path and the live-camera path so both store
    identical row shapes — including priority_source, which must survive to the
    UI so a rule-derived priority is never read back as a model prediction.
    """
    for index, damage in enumerate(damages, start=1):
        features = damage.get("features") or {}
        bbox = damage.get("bbox") or {}
        db.add(
            Detection(
                public_id=next_detection_public_id(inspection.public_id, index),
                inspection_id=inspection.id,
                frame_number=damage.get("frame_number"),
                frame_timestamp=damage.get("first_seen"),
                damage_type=damage.get("damage_type"),
                confidence=damage.get("confidence"),
                bbox_x=bbox.get("x"),
                bbox_y=bbox.get("y"),
                bbox_width=bbox.get("width"),
                bbox_height=bbox.get("height"),
                feature_bbox_area_ratio=features.get("bbox_area_ratio"),
                feature_aspect_ratio=features.get("aspect_ratio"),
                feature_frame_damage_count=int(features["frame_damage_count"])
                if features.get("frame_damage_count") is not None
                else None,
                feature_frame_damage_density=features.get("frame_damage_density"),
                feature_detector_confidence=features.get("detector_confidence"),
                feature_frame_position_y=features.get("frame_position_y"),
                priority=damage.get("priority"),
                priority_confidence=damage.get("priority_confidence"),
                priority_source=damage.get("priority_source"),
                model_version=damage.get("model_version"),
                image_path=damage.get("image_path"),
                # Inherit the inspection's map pin; per-detection GPS is not
                # available from an uploaded file or a webcam.
                latitude=inspection.latitude,
                longitude=inspection.longitude,
            )
        )
