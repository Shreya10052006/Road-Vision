"""Pydantic schemas for the Inspection resource.

Field names are snake_case (idiomatic FastAPI/Python) rather than the
frontend's camelCase TypeScript types. See backend/README.md for the exact
mapping the frontend service layer will need to apply when it eventually
switches from mock data to these endpoints.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.db.models import InspectionStatus, SourceType


class InspectionBase(BaseModel):
    title: str | None = None
    road: str | None = None
    area: str | None = None
    city: str | None = None
    ward: str | None = None
    inspector_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class InspectionCreate(InspectionBase):
    """Body for POST /api/inspections — used to start a Live Inspection
    Center session (source_type='live'). Upload-mode inspections are
    created via POST /api/inspections/upload instead, since that endpoint
    also needs a file."""

    source_type: SourceType = SourceType.live
    frame_sample_rate: int = Field(default=1, ge=1, le=30)


class InspectionRead(InspectionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(description="Public inspection ID, e.g. INSP-2026-0001")
    source_type: SourceType
    # "real" (pipeline output) or "demo" (seeded demonstration record).
    data_origin: str = "real"
    status: InspectionStatus
    frame_sample_rate: int
    frames_processed: int
    total_detections: int
    duration_seconds: int | None
    road_health_score: float | None
    original_filename: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None


class InspectionUploadResponse(BaseModel):
    inspection_id: str
    status: InspectionStatus
    message: str


class InspectionListResponse(BaseModel):
    items: list[InspectionRead]
    total: int
