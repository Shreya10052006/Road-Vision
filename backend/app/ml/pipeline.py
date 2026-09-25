"""
InspectionProcessor — joins the ML stages into one flow:

    video frame
      -> RoadDamageDetector (YOLOv8, 3 classes)
      -> FeatureExtractor   (6-feature vector)
      -> PriorityPredictor  (Random Forest, P1-P4)
      -> structured results

SCOPE
-----
Implemented: per-frame processing and training-data assembly. Both are pure
CPU work with no video decoding and no database.

Deliberately NOT here: video file decoding, frame sampling, DB persistence
and FastAPI wiring. Those come later and none of them change the contracts
below, so adding them will not require touching this file's logic.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.ml.detection.detector import RawDetection, RoadDamageDetector
from app.ml.features.extractor import FeatureExtractor, FeatureVector
from app.ml.priority.predictor import PriorityPredictor
from app.ml.priority.rules import RuleConfig, assign_priority


@dataclass
class ProcessedDetection:
    """One detection with its features and priority resolved.

    `priority_source` records HOW the priority was decided:
        "model" — trained Random Forest prediction
        "rule"  — provisional heuristic fallback

    This distinction must survive all the way to the UI and the report, so it
    is carried explicitly rather than inferred later. A rule-derived priority
    must never be presented as a model prediction.
    """

    detection: RawDetection
    features: FeatureVector
    priority: str
    priority_confidence: float | None
    priority_source: str
    model_version: str | None

    def to_dict(self) -> dict[str, Any]:
        d = self.detection
        return {
            "damage_type": d.damage_type,
            "confidence": d.confidence,
            "bbox": {"x": d.bbox_x, "y": d.bbox_y, "width": d.bbox_width, "height": d.bbox_height},
            "features": self.features.as_dict(),
            "priority": self.priority,
            "priority_confidence": self.priority_confidence,
            "priority_source": self.priority_source,
            "model_version": self.model_version,
        }


class InspectionProcessor:
    def __init__(
        self,
        detector: RoadDamageDetector | None = None,
        feature_extractor: FeatureExtractor | None = None,
        priority_predictor: PriorityPredictor | None = None,
        rule_config: RuleConfig | None = None,
    ):
        self.detector = detector or RoadDamageDetector()
        self.feature_extractor = feature_extractor or FeatureExtractor()
        self.priority_predictor = priority_predictor or PriorityPredictor()
        self.rule_config = rule_config

    # ----------------------------------------------------------- per frame
    def process_frame(
        self,
        frame_detections: list[RawDetection],
        frame_width: int,
        frame_height: int,
    ) -> list[ProcessedDetection]:
        """Features + priority for every detection in one frame.

        Zero detections returns [] — the normal clean-road case.

        Falls back to the rule when no Random Forest is loaded, so the pipeline
        runs end-to-end before the model exists. Every such result is tagged
        priority_source="rule".
        """
        feature_vectors = self.feature_extractor.extract_frame(
            frame_detections, frame_width, frame_height
        )

        results: list[ProcessedDetection] = []
        for detection, features in zip(frame_detections, feature_vectors):
            if self.priority_predictor.is_loaded:
                pred = self.priority_predictor.predict(detection.damage_type, features)
                results.append(
                    ProcessedDetection(
                        detection=detection,
                        features=features,
                        priority=pred.priority,
                        priority_confidence=pred.confidence,
                        priority_source="model",
                        model_version=pred.model_version,
                    )
                )
            else:
                results.append(
                    ProcessedDetection(
                        detection=detection,
                        features=features,
                        priority=assign_priority(detection.damage_type, features, self.rule_config),
                        priority_confidence=None,
                        priority_source="rule",
                        model_version=None,
                    )
                )
        return results

    def detect_and_process(self, frame: Any, frame_width: int, frame_height: int) -> list[ProcessedDetection]:
        """Convenience: run the loaded detector on a frame, then process it."""
        return self.process_frame(self.detector.detect(frame), frame_width, frame_height)

    # ------------------------------------------------------ training data
    def build_training_data(
        self,
        frames: list[tuple[list[RawDetection], int, int]],
    ) -> tuple[list[tuple[str, FeatureVector]], list[str]]:
        """Turn frames of real detections into (samples, provisional labels)
        ready for PriorityPredictor.train().

        `frames` is [(detections, frame_width, frame_height), ...]. Frames with
        no detections contribute nothing — there is no defect to prioritize.

        The labels returned are RULE-DERIVED AND PROVISIONAL. See
        app/ml/priority/rules.py for the provenance statement that must
        accompany any use of them.
        """
        samples: list[tuple[str, FeatureVector]] = []
        labels: list[str] = []

        for detections, width, height in frames:
            feature_vectors = self.feature_extractor.extract_frame(detections, width, height)
            for detection, features in zip(detections, feature_vectors):
                samples.append((detection.damage_type, features))
                labels.append(assign_priority(detection.damage_type, features, self.rule_config))
        return samples, labels
