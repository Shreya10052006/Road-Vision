from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import InspectionStatus, SourceType
from app.schemas.detection import DetectionListResponse, DetectionRead
from app.schemas.inspection import (
    InspectionCreate,
    InspectionListResponse,
    InspectionRead,
    InspectionUploadResponse,
)
from app.services import detection_service, inspection_service
from app.services.inspection_service import InvalidUploadError

router = APIRouter(prefix="/inspections", tags=["inspections"])


@router.get("", response_model=InspectionListResponse)
def list_inspections(
    source: SourceType | None = Query(default=None),
    status_filter: InspectionStatus | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> InspectionListResponse:
    items, total = inspection_service.list_inspections(
        db, source_type=source, status_filter=status_filter, search=search, limit=limit, offset=offset
    )
    return InspectionListResponse(
        items=[InspectionRead(**inspection_service.to_read_dict(i)) for i in items], total=total
    )


@router.post("", response_model=InspectionRead, status_code=status.HTTP_201_CREATED)
def create_inspection(payload: InspectionCreate, db: Session = Depends(get_db)) -> InspectionRead:
    """Starts a Live Inspection Center session record. (Upload-mode
    inspections go through POST /inspections/upload instead.)"""
    if payload.source_type != SourceType.live:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use POST /api/inspections/upload for upload-mode inspections.",
        )
    inspection = inspection_service.create_live_inspection(db, payload)
    return InspectionRead(**inspection_service.to_read_dict(inspection))


@router.post("/upload", response_model=InspectionUploadResponse, status_code=status.HTTP_201_CREATED)
def upload_inspection(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    road: str | None = Form(default=None),
    area: str | None = Form(default=None),
    city: str | None = Form(default=None),
    ward: str | None = Form(default=None),
    inspector_name: str | None = Form(default=None),
    latitude: float | None = Form(default=None),
    longitude: float | None = Form(default=None),
    frame_sample_rate: int = Form(default=1),
    db: Session = Depends(get_db),
) -> InspectionUploadResponse:
    """Receives an uploaded road video, validates it, saves it, and creates
    an Inspection record. Does NOT run OpenCV/YOLO/Random Forest — see
    app/ml/pipeline.py for the documented future integration point."""
    payload = InspectionCreate(
        title=title,
        road=road,
        area=area,
        city=city,
        ward=ward,
        inspector_name=inspector_name,
        latitude=latitude,
        longitude=longitude,
        source_type=SourceType.upload,
        frame_sample_rate=frame_sample_rate,
    )
    try:
        inspection = inspection_service.save_upload(db, file, payload)
    except InvalidUploadError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return InspectionUploadResponse(
        inspection_id=inspection.public_id,
        status=inspection.status,
        message="Video uploaded successfully",
    )


@router.get("/{inspection_id}", response_model=InspectionRead)
def get_inspection(inspection_id: str, db: Session = Depends(get_db)) -> InspectionRead:
    inspection = inspection_service.get_inspection_or_404(db, inspection_id)
    return InspectionRead(**inspection_service.to_read_dict(inspection))


@router.get("/{inspection_id}/detections", response_model=DetectionListResponse)
def get_inspection_detections(
    inspection_id: str,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> DetectionListResponse:
    # 404s if the inspection itself doesn't exist, before we bother querying detections.
    inspection_service.get_inspection_or_404(db, inspection_id)
    items, total = detection_service.list_detections(
        db, inspection_public_id=inspection_id, limit=limit, offset=offset
    )
    return DetectionListResponse(
        items=[DetectionRead(**detection_service.to_read_dict(d, inspection_id)) for d in items],
        total=total,
    )


@router.delete("/{inspection_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_inspection(inspection_id: str, db: Session = Depends(get_db)) -> None:
    inspection_service.delete_inspection(db, inspection_id)
