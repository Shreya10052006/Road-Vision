"""Pydantic schemas for the Detection resource.

Every CV/ML-derived field is Optional and defaults to None — a detection
row can exist (a frame was captured) before the detector, feature
extractor, or priority model have run on it. None means "not yet
processed"; it is never backfilled with a fabricated value.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DetectionFeatures(BaseModel):
    """The locked V1 feature vector (ML_Pipeline.md §4). All fields are
    None until feature extraction has actually run for this detection."""

    bbox_area_ratio: float | None = None
    aspect_ratio: float | None = None
    frame_damage_count: int | None = None
    frame_damage_density: float | None = None
    detector_confidence: float | None = None
    frame_position_y: float | None = None


class DetectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    inspection_id: str

    frame_number: int | None
    frame_timestamp: str | None

    # Denormalised from the parent inspection so the Detection Explorer and
    # map can label a row without a second request.
    road: str | None = None
    area: str | None = None

    damage_type: str | None
    confidence: float | None
    bbox_x: float | None
    bbox_y: float | None
    bbox_width: float | None
    bbox_height: float | None

    priority: str | None
    priority_confidence: float | None
    # "rule" (provisional heuristic) or "model" (Random Forest).
    priority_source: str | None = None
    model_version: str | None

    features: DetectionFeatures

    latitude: float | None
    longitude: float | None
    image_path: str | None

    is_read: bool
    created_at: datetime


class DetectionListResponse(BaseModel):
    items: list[DetectionRead]
    total: int


class MapDetectionRead(BaseModel):
    """A slimmer projection for the Damage Map — only detections that are
    both geotagged and prioritized are meaningful on a map, so the map
    endpoint filters to those before returning."""

    id: str
    inspection_id: str
    latitude: float
    longitude: float
    road: str | None
    area: str | None
    damage_type: str | None
    priority: str | None
    confidence: float | None = None
    ward: str | None = None
    # "demo" (seeded demonstration record) or "real" (pipeline output).
    data_origin: str = "real"
