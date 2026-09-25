"""
ML routes — model status, image, video and live-camera inference.

    GET  /api/ml/status                          model + contract state
    POST /api/ml/detect                          one uploaded image
    POST /api/ml/detect-video                    uploaded video, saved as an inspection
    POST /api/ml/live/sessions                   start a live webcam session
    POST /api/ml/detect-frame                    one live webcam frame
    POST /api/ml/live/sessions/{id}/finalize     aggregate + save the session
    DELETE /api/ml/live/sessions/{id}            discard without saving

All three inference routes share one loaded model and one pipeline; none of
them re-implements YOLO, feature extraction or the priority rule.
"""

from __future__ import annotations

import shutil
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import get_db
from app.ml.video import SUPPORTED_VIDEO_EXTENSIONS, VideoConfig, VideoProcessingError
from app.db.models import InspectionStatus
from app.services import live_service, ml_service, road_health, video_service
from app.services.live_service import LiveSessionError

router = APIRouter(prefix="/ml", tags=["ml"])
settings = get_settings()

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


@router.get("/status")
def ml_status() -> dict:
    """Whether best.pt / the Random Forest bundle are present and loadable."""
    return ml_service.status()


@router.post("/detect")
async def detect_image(
    file: UploadFile = File(...),
    save: bool = Form(default=False),
    title: str | None = Form(default=None),
    road: str | None = Form(default=None),
    area: str | None = Form(default=None),
    city: str | None = Form(default=None),
    ward: str | None = Form(default=None),
    inspector_name: str | None = Form(default=None),
    latitude: float | None = Form(default=None),
    longitude: float | None = Form(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Run detection + priority assignment on a single uploaded image.

    Analysis-only by default, exactly as before. With save=true the result is
    also written as an ordinary Inspection (source=upload, data_origin=real)
    through the same services the video and live paths use, so a one-off image
    check can appear in History alongside everything else. The detection
    pipeline itself is untouched either way.
    """
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type {suffix or '(none)'}. Allowed: "
            + ", ".join(sorted(ALLOWED_IMAGE_EXTENSIONS)),
        )

    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
        result = ml_service.analyze_image(tmp_path)

        if save:
            inspection = video_service.create_inspection(
                db,
                filename=file.filename or "image",
                file_path=Path(file.filename or "image"),
                meta={
                    "title": title or "Image Inspection",
                    "road": road,
                    "area": area,
                    "city": city,
                    "ward": ward,
                    "inspector_name": inspector_name,
                    "latitude": latitude,
                    "longitude": longitude,
                },
            )
            video_service.persist_damages(db, inspection, result["detections"])
            inspection.frames_processed = 1
            inspection.total_detections = result["detection_count"]
            inspection.duration_seconds = 0
            inspection.road_health_score = road_health.score_from_priorities(
                [d.get("priority") for d in result["detections"]]
            )
            inspection.status = InspectionStatus.completed
            inspection.completed_at = datetime.now(timezone.utc)
            db.commit()
            result["inspection_id"] = inspection.public_id
            result["status"] = inspection.status.value

        return result
    except (FileNotFoundError, ImportError, ValueError) as exc:
        # best.pt not dropped in yet, or ultralytics not installed.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"The detection model is not available yet: {exc}",
        ) from exc
    finally:
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)


@router.post("/detect-video")
async def detect_video(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    road: str | None = Form(default=None),
    area: str | None = Form(default=None),
    city: str | None = Form(default=None),
    ward: str | None = Form(default=None),
    inspector_name: str | None = Form(default=None),
    latitude: float | None = Form(default=None),
    longitude: float | None = Form(default=None),
    target_fps: float = Form(default=2.0),
    max_frames: int = Form(default=120),
    db: Session = Depends(get_db),
) -> dict:
    """Process an uploaded video end to end and persist it as an inspection.

    Samples frames with OpenCV, runs each through YOLO -> features -> priority,
    aggregates repeated sightings of the same defect, stores one Detection row
    per unique damage, and returns the summary plus per-frame detail.
    """
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SUPPORTED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported video type {suffix or '(none)'}. Allowed: "
            + ", ".join(sorted(SUPPORTED_VIDEO_EXTENSIONS)),
        )

    # Fail early on an oversized upload rather than after writing it to disk.
    size = getattr(file, "size", None)
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if size is not None and size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Video is larger than the {settings.max_upload_size_mb} MB limit.",
        )

    try:
        processor = ml_service.get_processor()
    except (FileNotFoundError, ImportError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"The detection model is not available yet: {exc}",
        ) from exc

    meta = {
        "title": title,
        "road": road,
        "area": area,
        "city": city,
        "ward": ward,
        "inspector_name": inspector_name,
        "latitude": latitude,
        "longitude": longitude,
    }

    inspection = video_service.create_inspection(
        db, filename=file.filename or "video", file_path=Path("pending"), meta=meta
    )
    try:
        saved = video_service.save_video_upload(file, inspection.public_id)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save the uploaded video: {exc}",
        ) from exc
    finally:
        file.file.close()

    inspection.file_path = str(saved)
    db.commit()

    config = VideoConfig(
        target_fps=max(0.1, min(target_fps, 30.0)),
        max_frames=max(1, min(max_frames, 600)),
    )

    try:
        return video_service.process_and_persist(db, inspection, str(saved), processor, config)
    except VideoProcessingError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Video processing failed: {exc}",
        ) from exc


# --------------------------------------------------------------- live camera
#
# The browser samples webcam frames (~2 fps) and posts them here one at a time.
# Each frame runs through the SAME pipeline as POST /api/ml/detect — this route
# adds per-frame counts and a processing time, and optionally records the frame
# against a live session so it can be aggregated and saved on stop.


@router.post("/live/sessions", status_code=status.HTTP_201_CREATED)
def start_live_session() -> dict:
    session = live_service.start_session()
    return {"session_id": session.id, "started": True}


@router.post("/detect-frame")
async def detect_frame(
    file: UploadFile = File(...),
    session_id: str | None = Form(default=None),
) -> dict:
    """Run one live webcam frame through the image pipeline."""
    suffix = Path(file.filename or "frame.jpg").suffix.lower() or ".jpg"
    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        suffix = ".jpg"  # the browser names canvas blobs loosely; trust the content

    tmp_path: str | None = None
    started = time.perf_counter()
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        result = ml_service.analyze_image(tmp_path, include_objects=True)
        detections = result["detections"]

        frame_index: int | None = None
        if session_id:
            try:
                frame_index = live_service.record_frame(session_id, result["processed"])
            except LiveSessionError as exc:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

        counts_by_type: dict[str, int] = {}
        counts_by_priority: dict[str, int] = {}
        for d in detections:
            counts_by_type[d["damage_type"]] = counts_by_type.get(d["damage_type"], 0) + 1
            counts_by_priority[d["priority"]] = counts_by_priority.get(d["priority"], 0) + 1
        confidences = [d["confidence"] for d in detections]

        return {
            "frame_index": frame_index,
            "image_width": result["image_width"],
            "image_height": result["image_height"],
            "detection_count": len(detections),
            "detections": detections,
            "counts_by_type": counts_by_type,
            "counts_by_priority": counts_by_priority,
            "average_confidence": round(sum(confidences) / len(confidences), 4) if confidences else 0.0,
            "processing_time_ms": round((time.perf_counter() - started) * 1000, 1),
        }
    except HTTPException:
        raise
    except (FileNotFoundError, ImportError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"The detection model is not available yet: {exc}",
        ) from exc
    except Exception as exc:
        # A single bad frame must never kill the live session.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Frame could not be processed: {exc}",
        ) from exc
    finally:
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)


@router.post("/live/sessions/{session_id}/finalize")
def finalize_live_session(
    session_id: str,
    title: str | None = Form(default=None),
    road: str | None = Form(default=None),
    area: str | None = Form(default=None),
    city: str | None = Form(default=None),
    ward: str | None = Form(default=None),
    inspector_name: str | None = Form(default=None),
    latitude: float | None = Form(default=None),
    longitude: float | None = Form(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Aggregate the session's frames and save it as a live Inspection."""
    meta = {
        "title": title,
        "road": road,
        "area": area,
        "city": city,
        "ward": ward,
        "inspector_name": inspector_name,
        "latitude": latitude,
        "longitude": longitude,
    }
    try:
        return live_service.finalize_session(db, session_id, meta)
    except LiveSessionError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/live/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def discard_live_session(session_id: str) -> None:
    """Drop a session without saving it (user stopped without finalizing)."""
    live_service.discard_session(session_id)
