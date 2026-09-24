"""
ML service — the single place the API touches the CV/ML layer.

Holds one lazily-loaded InspectionProcessor for the whole process (loading a
YOLO checkpoint per request would be far too slow), and reports honestly on
what is and is not available so the demo degrades gracefully instead of
crashing when best.pt has not been dropped in yet.

Priority provenance rule (see ML_Pipeline.md §1.1): a priority produced by the
rule heuristic is ALWAYS returned with priority_source="rule" and is
provisional. It is never presented as a Random Forest prediction.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.ml.detection.detector import DAMAGE_CLASSES, RoadDamageDetector
from app.ml.features.extractor import FEATURE_NAMES
from app.ml.pipeline import InspectionProcessor
from app.ml.priority.predictor import MODEL_INPUT_COLUMNS, PriorityPredictor
from app.ml.priority.rules import PRIORITY_LEVELS

logger = logging.getLogger("roadvision.ml")
settings = get_settings()

_processor: InspectionProcessor | None = None
_load_error: str | None = None


def _build_processor() -> InspectionProcessor:
    """Create the processor, loading whichever models are actually present."""
    detector = RoadDamageDetector(
        model_path=str(settings.yolo_model_path),
        conf=settings.detection_conf_threshold,
        iou=settings.detection_iou_threshold,
    )
    detector.load()  # raises if best.pt or ultralytics is missing

    predictor = PriorityPredictor()
    if Path(settings.priority_model_path).exists():
        try:
            predictor.load(str(settings.priority_model_path))
        except Exception:  # a bad RF bundle must not take the detector down
            logger.exception("Could not load the Random Forest bundle; falling back to the rule.")

    return InspectionProcessor(detector=detector, priority_predictor=predictor)


def get_processor() -> InspectionProcessor:
    """Return the shared processor, loading it on first use."""
    global _processor, _load_error
    if _processor is None:
        _processor = _build_processor()
        _load_error = None
    return _processor


def _ultralytics_installed() -> bool:
    try:
        import ultralytics  # noqa: F401
    except Exception:
        return False
    return True


def status() -> dict[str, Any]:
    """What the ML layer can currently do — used by GET /api/ml/status."""
    yolo_path = Path(settings.yolo_model_path)
    rf_path = Path(settings.priority_model_path)
    yolo_present = yolo_path.exists()
    ultra = _ultralytics_installed()

    # Only known once the checkpoint has actually been loaded.
    checkpoint_classes: dict[int, str] | None = None
    classes_match: bool | None = None
    if _processor is not None:
        detector = getattr(_processor, "detector", None)
        checkpoint_classes = getattr(detector, "checkpoint_class_names", None) or None
        classes_match = getattr(detector, "class_names_match", None)

    return {
        "detector": {
            "model_path": str(yolo_path),
            "model_present": yolo_present,
            "ultralytics_installed": ultra,
            "ready": yolo_present and ultra,
            "conf_threshold": settings.detection_conf_threshold,
            "iou_threshold": settings.detection_iou_threshold,
            "checkpoint_class_names": checkpoint_classes,
            "class_names_match_expected": classes_match,
        },
        "priority_model": {
            "model_path": str(rf_path),
            "model_present": rf_path.exists(),
            "active_source": "model" if rf_path.exists() else "rule",
        },
        "contract": {
            "damage_classes": list(DAMAGE_CLASSES),
            "priority_levels": list(PRIORITY_LEVELS),
            "feature_names": list(FEATURE_NAMES),
            "model_input_columns": list(MODEL_INPUT_COLUMNS),
        },
        "notes": (
            "Until a Random Forest bundle exists, priorities are rule-derived and "
            "returned with priority_source='rule'. Rule-derived labels are "
            "provisional and are not dataset ground truth."
        ),
        "loaded": _processor is not None,
        "last_load_error": _load_error,
    }


def analyze_image(image_path: str, include_objects: bool = False) -> dict[str, Any]:
    """Detect damage in one image and resolve a priority for each detection.

    `include_objects=True` adds the raw ProcessedDetection objects under
    "processed" for in-process callers (the live session recorder). They are
    not JSON-serializable by design, so API routes leave them out.
    """
    global _load_error
    try:
        processor = get_processor()
    except Exception as exc:
        _load_error = str(exc)
        raise

    width, height = _image_size(image_path)
    processed = processor.detect_and_process(image_path, width, height)

    payload: dict[str, Any] = {
        "image_width": width,
        "image_height": height,
        "detection_count": len(processed),
        "detections": [p.to_dict() for p in processed],
    }
    if include_objects:
        payload["processed"] = processed
    return payload


def _image_size(image_path: str) -> tuple[int, int]:
    from PIL import Image

    with Image.open(image_path) as im:
        return im.width, im.height
