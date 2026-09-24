"""
Feature extraction — the six-feature vector the priority model consumes.

Frozen order (the frontend's camelCase names in brackets):

    1. bbox_area_ratio       [bboxAreaRatio]
    2. aspect_ratio          [aspectRatio]
    3. frame_damage_count    [frameDamageCount]
    4. frame_damage_density  [frameDamageDensity]
    5. detector_confidence   [detectorConfidence]
    6. frame_position_y      [framePositionY]

damage_type is also a model input, but it travels separately and is one-hot
encoded at the model boundary (predictor.py) rather than here.

FEATURE_NAMES is the ordering contract shared by the DB columns, the training
matrix, and inference. Nothing may reorder it independently.
"""

from __future__ import annotations

from dataclasses import astuple, dataclass

from app.ml.detection.detector import RawDetection

FEATURE_NAMES: tuple[str, ...] = (
    "bbox_area_ratio",
    "aspect_ratio",
    "frame_damage_count",
    "frame_damage_density",
    "detector_confidence",
    "frame_position_y",
)

_EPS = 1e-9


@dataclass
class FeatureVector:
    bbox_area_ratio: float
    aspect_ratio: float
    frame_damage_count: int
    frame_damage_density: float
    detector_confidence: float
    frame_position_y: float

    def as_list(self) -> list[float]:
        """Ordered values, matching FEATURE_NAMES exactly."""
        return [float(v) for v in astuple(self)]

    def as_dict(self) -> dict[str, float]:
        return dict(zip(FEATURE_NAMES, self.as_list()))


class FeatureExtractor:
    """Pure and stateless. No model, no GPU, safe to run anywhere."""

    def extract(
        self,
        detection: RawDetection,
        frame_detections: list[RawDetection],
        frame_width: int,
        frame_height: int,
    ) -> FeatureVector:
        """Features for ONE detection in the context of its whole frame.

        `frame_detections` must include `detection` itself — the frame-level
        features describe the frame the detection sits in.
        """
        frame_area = float(frame_width) * float(frame_height)
        if frame_area <= 0:
            raise ValueError(f"Invalid frame dimensions: {frame_width}x{frame_height}")

        bbox_area = max(0.0, detection.bbox_width) * max(0.0, detection.bbox_height)

        # Clamped: overlapping boxes can otherwise sum past the frame's own area.
        total_damage_area = sum(
            max(0.0, d.bbox_width) * max(0.0, d.bbox_height) for d in frame_detections
        )

        # Normalized vertical centre. In forward-facing footage, lower in the
        # frame (-> 1.0) is nearer the vehicle.
        centre_y = detection.bbox_y + detection.bbox_height / 2.0

        return FeatureVector(
            bbox_area_ratio=min(1.0, bbox_area / frame_area),
            aspect_ratio=detection.bbox_width / max(detection.bbox_height, _EPS),
            frame_damage_count=len(frame_detections),
            frame_damage_density=min(1.0, total_damage_area / frame_area),
            detector_confidence=float(detection.confidence),
            frame_position_y=min(1.0, max(0.0, centre_y / float(frame_height))),
        )

    def extract_frame(
        self,
        frame_detections: list[RawDetection],
        frame_width: int,
        frame_height: int,
    ) -> list[FeatureVector]:
        """Features for every detection in a frame.

        Zero detections returns [] — the normal clean-road case, not an error.
        Nothing downstream may divide by the count.
        """
        if not frame_detections:
            return []
        return [self.extract(d, frame_detections, frame_width, frame_height) for d in frame_detections]
