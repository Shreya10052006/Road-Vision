"""
Rule-based PROVISIONAL priority labelling.

===========================================================================
PROVENANCE — READ BEFORE CITING THESE LABELS ANYWHERE
===========================================================================
Neither RDD2022 nor the current 3-class road-damage dataset contains
maintenance-priority labels. Both provide damage-type bounding boxes only.

The P1-P4 labels produced here are NOT ground-truth dataset labels and must
never be described as such. They are a deterministic heuristic written by
this project, used to bootstrap a training set at scale for the Random
Forest.

The model's REPORTED accuracy must therefore be measured against an
independent, manually-reviewed subset — never against this rule, which the
model would trivially reproduce.

Wording to use in the report:

    "Because the road-damage dataset provides damage categories rather than
    maintenance priorities, a rule-based labeling process assigns initial
    P1-P4 labels from damage type, relative size, and damage density. These
    provisional labels train the Random Forest, and the model's reported
    accuracy is measured against an independent, manually reviewed subset —
    not against the rule that generated its training labels."
===========================================================================

Every tunable lives in RuleConfig. Change them there and nowhere else.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.ml.features.extractor import FeatureVector

PRIORITY_LEVELS: tuple[str, ...] = ("P1", "P2", "P3", "P4")

PRIORITY_LABELS: dict[str, str] = {
    "P1": "Immediate",
    "P2": "Within 7 Days",
    "P3": "Scheduled Maintenance",
    "P4": "Monitor Only",
}


@dataclass(frozen=True)
class RuleConfig:
    """Tunables for the provisional labelling rule.

    CALIBRATION NOTE
    ----------------
    The saturation constants below were set from the ACTUAL box geometry of
    the current 3-class dataset (1,846 boxes measured):

        bbox_area_ratio       median 0.097   p75 0.334   p90 0.777
        frame_damage_density  median 0.298   p75 0.635   p90 0.996

    Each saturation point is that feature's ~p75, so roughly the top quarter
    of boxes max out that term and the rest spread across the range.

    These images are close-up damage photographs, NOT forward-facing dashcam
    frames — boxes here occupy far more of the frame than road footage will.
    When the pipeline is pointed at real dashcam video, re-measure and lower
    these, or everything will collapse into P3/P4. `summarize_label_distribution()`
    makes that a one-line check.
    """

    # Weights — must sum to 1.0
    w_area: float = 0.45
    w_density: float = 0.25
    w_damage_type: float = 0.20
    w_confidence: float = 0.10

    # Saturation points: the value at which a feature counts as 1.0.
    area_ratio_saturation: float = 0.35
    density_saturation: float = 0.65

    # Severity weight per damage type (3-class dataset).
    #   pothole         — structural failure, immediate safety hazard
    #   surface_erosion — progressive surface loss, worsens but not acute
    #   crack           — merged class spanning hairline to alligator, so a
    #                     mid weight; it cannot be split further at this
    #                     taxonomy's resolution
    damage_type_weight: dict[str, float] = field(
        default_factory=lambda: {
            "pothole": 1.00,
            "surface_erosion": 0.60,
            "crack": 0.55,
        }
    )
    unknown_damage_type_weight: float = 0.50

    # Score thresholds (inclusive lower bounds)
    p1_threshold: float = 0.75
    p2_threshold: float = 0.50
    p3_threshold: float = 0.25


DEFAULT_RULE_CONFIG = RuleConfig()


def priority_score(damage_type: str, features: FeatureVector, config: RuleConfig | None = None) -> float:
    """Continuous 0-1 severity score. Deterministic: same input, same output."""
    cfg = config or DEFAULT_RULE_CONFIG

    area_norm = min(1.0, features.bbox_area_ratio / max(cfg.area_ratio_saturation, 1e-9))
    density_norm = min(1.0, features.frame_damage_density / max(cfg.density_saturation, 1e-9))
    type_weight = cfg.damage_type_weight.get(damage_type, cfg.unknown_damage_type_weight)
    confidence = min(1.0, max(0.0, features.detector_confidence))

    score = (
        cfg.w_area * area_norm
        + cfg.w_density * density_norm
        + cfg.w_damage_type * type_weight
        + cfg.w_confidence * confidence
    )
    return min(1.0, max(0.0, score))


def assign_priority(damage_type: str, features: FeatureVector, config: RuleConfig | None = None) -> str:
    """Provisional P1-P4 label for one detection. See module docstring."""
    cfg = config or DEFAULT_RULE_CONFIG
    score = priority_score(damage_type, features, cfg)
    if score >= cfg.p1_threshold:
        return "P1"
    if score >= cfg.p2_threshold:
        return "P2"
    if score >= cfg.p3_threshold:
        return "P3"
    return "P4"


def summarize_label_distribution(labels: list[str]) -> dict[str, int]:
    """Counts per tier. Run this on real detections BEFORE training — if one
    tier is empty or dominant, recalibrate RuleConfig rather than training on it."""
    return {level: labels.count(level) for level in PRIORITY_LEVELS}
