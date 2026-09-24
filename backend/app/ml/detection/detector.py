"""
YOLO detection boundary for RoadVision.

Dataset in use: the 3-class road-damage set (914 train / 161 valid images,
1,846 boxes). Class ids come straight from its data.yaml:

    0 = Crack            1 = Pothole            2 = Surface Erosion

This is NOT the 4-class RDD2022 taxonomy. `Crack` here merges what RDD2022
split into longitudinal / transverse / alligator, and `Surface Erosion` has
no RDD2022 equivalent.

`ultralytics` is imported lazily inside load(), so this module (and the whole
pipeline) imports cleanly on a machine with no torch installed.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

# --- Single source of truth for class identity. Change here and nowhere else. ---
CLASS_ID_TO_DAMAGE_TYPE: dict[int, str] = {
    0: "crack",
    1: "pothole",
    2: "surface_erosion",
}

DAMAGE_CLASSES: tuple[str, ...] = ("crack", "pothole", "surface_erosion")

DISPLAY_NAMES: dict[str, str] = {
    "crack": "Crack",
    "pothole": "Pothole",
    "surface_erosion": "Surface Erosion",
}

NUM_CLASSES = len(DAMAGE_CLASSES)  # 3


@dataclass
class RawDetection:
    """One detected box.

    Coordinates are PIXELS in the source frame: (bbox_x, bbox_y) is the
    top-left corner; width/height extend right/down. Normalization against
    frame size happens once, in FeatureExtractor.
    """

    damage_type: str
    confidence: float
    bbox_x: float
    bbox_y: float
    bbox_width: float
    bbox_height: float


def detections_from_yolo(result: Any, class_map: dict[int, str] | None = None) -> list[RawDetection]:
    """Convert one Ultralytics ``Results`` object into RawDetection objects.

    Duck-typed on ``result.boxes`` so ultralytics is never imported here.
    A frame with no detections returns [] — a valid outcome, not an error.
    Unknown class ids are skipped rather than guessed: a mislabelled
    detection is worse than a missing one.
    """
    mapping = class_map or CLASS_ID_TO_DAMAGE_TYPE
    boxes = getattr(result, "boxes", None)
    if boxes is None or len(boxes) == 0:
        return []

    out: list[RawDetection] = []
    for box in boxes:
        x1, y1, x2, y2 = (float(v) for v in box.xyxy[0].tolist())
        damage_type = mapping.get(int(box.cls[0]))
        if damage_type is None:
            continue
        out.append(
            RawDetection(
                damage_type=damage_type,
                confidence=float(box.conf[0]),
                bbox_x=x1,
                bbox_y=y1,
                bbox_width=max(0.0, x2 - x1),
                bbox_height=max(0.0, y2 - y1),
            )
        )
    return out


class RoadDamageDetector:
    """Thin wrapper over a trained YOLOv8 checkpoint (best.pt)."""

    def __init__(self, model_path: str | None = None, conf: float = 0.25, iou: float = 0.45):
        self.model_path = model_path
        self.conf = conf
        self.iou = iou
        self._model: Any = None
        # Filled in by load(): the class names baked into the checkpoint, and
        # whether they line up with this module's class map.
        self.checkpoint_class_names: dict[int, str] = {}
        self.class_names_match: bool | None = None

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def load(self) -> None:
        """Load best.pt. Raises a clear error if the checkpoint or ultralytics
        is missing, rather than failing obscurely later."""
        if not self.model_path:
            raise ValueError("No model_path given. Point this at your trained best.pt.")
        try:
            from ultralytics import YOLO  # lazy: keeps torch off the import path
        except ImportError as exc:
            raise ImportError("ultralytics is not installed. `pip install ultralytics`.") from exc

        from pathlib import Path

        if not Path(self.model_path).exists():
            raise FileNotFoundError(
                f"No YOLO checkpoint at {self.model_path!r}. Train it first, then place best.pt there."
            )
        self._model = YOLO(self.model_path)
        self._verify_classes()

    def _verify_classes(self) -> None:
        """Check the checkpoint's own class names against CLASS_ID_TO_DAMAGE_TYPE.

        Detections are mapped by class INDEX, so a checkpoint trained with a
        different class order would silently mislabel every box. This records
        the checkpoint's names and whether they agree, and warns loudly if they
        do not — it does not raise, so a demo still runs and the mismatch is
        visible in GET /api/ml/status.
        """
        import logging

        names = getattr(self._model, "names", None) or {}
        self.checkpoint_class_names = {int(k): str(v) for k, v in dict(names).items()}

        def normalize(value: str) -> str:
            return value.strip().lower().replace(" ", "_").replace("-", "_")

        expected = CLASS_ID_TO_DAMAGE_TYPE
        self.class_names_match = all(
            normalize(self.checkpoint_class_names.get(idx, "")) == expected_name
            for idx, expected_name in expected.items()
        ) and len(self.checkpoint_class_names) == len(expected)

        if not self.class_names_match:
            logging.getLogger("roadvision.ml").warning(
                "Checkpoint classes %s do not match the expected 3-class map %s. "
                "Detections are mapped by index, so labels may be wrong.",
                self.checkpoint_class_names,
                expected,
            )

    def detect(self, frame: Any) -> list[RawDetection]:
        """Run detection on a single frame (numpy array / path / PIL image)."""
        if self._model is None:
            raise RuntimeError("Detector not loaded. Call load() first.")
        results = self._model.predict(frame, conf=self.conf, iou=self.iou, verbose=False)
        if not results:
            return []
        return detections_from_yolo(results[0])
