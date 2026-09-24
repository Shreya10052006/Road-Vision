"""
Road Health Score — a PROVISIONAL, project-level decision-support metric.

This is NOT an engineering-standard pavement condition index (it is not PCI,
IRI, or any municipal standard). It is a simple, deterministic, explainable
number this project defines so a single inspection can be summarised at a
glance, and so the dashboard has one consistent figure everywhere.

Definition
----------
Two things make a road stretch unhealthy: how severe its defects are, and how
many there are. The score weighs both, and nothing else:

    penalty weights      P1 = 12   P2 = 6   P3 = 3   P4 = 1

    severity = (sum of penalties) / (number of detections)      -> 1 .. 12
    volume   = min(1, number of detections / 40)                -> 0 .. 1

    score    = 100 - (severity / 12) * 60 - volume * 40

So severity accounts for up to 60 points and sheer volume for up to 40. An
inspection with a handful of P4s scores high; one with many P1s scores near
zero. Forty detections is the point where the volume term saturates — a
deliberate project choice, not a standard.

Bounded 0-100, deterministic (same rows always give the same number), and
computed by this one function wherever a score is needed — the seed script,
the video pipeline and the live pipeline all call it, so no page can disagree
with another.

Because the priorities feeding it are rule-derived and provisional, the score
inherits that status: it is a relative indicator for triage, not a measurement.
"""

from __future__ import annotations

PRIORITY_PENALTY: dict[str, int] = {"P1": 12, "P2": 6, "P3": 3, "P4": 1}

MAX_PENALTY = 12          # the P1 weight: the worst possible average severity
VOLUME_SATURATION = 40    # detections at which the volume term maxes out
SEVERITY_WEIGHT = 60      # points attributable to severity
VOLUME_WEIGHT = 40        # points attributable to volume

# Health bands used by the dashboard's Road Health Distribution.
BANDS: tuple[tuple[str, int], ...] = (
    ("Excellent", 80),
    ("Good", 65),
    ("Fair", 50),
    ("Poor", 35),
    ("Very Poor", 0),
)

BAND_COLORS: dict[str, str] = {
    "Excellent": "#43A047",
    "Good": "#8BC34A",
    "Fair": "#FDD835",
    "Poor": "#FB8C00",
    "Very Poor": "#E53935",
}


def score_from_priority_counts(counts: dict[str, int]) -> float:
    """Road Health Score for one inspection, from its P1-P4 detection counts.

    No detections means nothing was found, which is the healthy case: 100.
    """
    total = sum(counts.get(p, 0) for p in PRIORITY_PENALTY)
    if total == 0:
        return 100.0

    penalty = sum(PRIORITY_PENALTY.get(p, 0) * n for p, n in counts.items())
    severity = penalty / total
    volume = min(1.0, total / VOLUME_SATURATION)

    score = 100 - (severity / MAX_PENALTY) * SEVERITY_WEIGHT - volume * VOLUME_WEIGHT
    return round(max(0.0, min(100.0, score)), 1)


def score_from_priorities(priorities: list[str | None]) -> float:
    counts: dict[str, int] = {}
    for p in priorities:
        if p:
            counts[p] = counts.get(p, 0) + 1
    return score_from_priority_counts(counts)


def band_for(score: float) -> str:
    for label, floor in BANDS:
        if score >= floor:
            return label
    return "Very Poor"


def distribution(scores: list[float]) -> list[dict]:
    """Percentage of inspections in each health band (empty list if none)."""
    if not scores:
        return []
    counts = {label: 0 for label, _ in BANDS}
    for s in scores:
        counts[band_for(s)] += 1
    total = len(scores)
    return [
        {
            "label": label,
            "percentage": round(counts[label] / total * 100, 1),
            "color": BAND_COLORS[label],
        }
        for label, _ in BANDS
    ]
