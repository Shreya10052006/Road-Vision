"""
RoadVision API — FastAPI application entrypoint.

Run locally with:
    uvicorn app.main:app --reload

See backend/README.md for full setup instructions.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import SQLAlchemyError

from app.api.routes import (
    analytics,
    dashboard,
    detections,
    health,
    inspections,
    map as map_routes,
    ml,
)
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.database import init_db

settings = get_settings()
configure_logging()
logger = logging.getLogger("roadvision")

# Ensure uploads directories exist
settings.upload_dir.mkdir(parents=True, exist_ok=True)
(settings.upload_dir / "frames").mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("%s starting up (env=%s)", settings.app_name, settings.environment)
    yield


app = FastAPI(
    title=settings.app_name,
    description=(
        "Backend foundation for RoadVision: inspections, detections, dashboard, "
        "map, and analytics. The CV/YOLO/Random-Forest layer is wired in under "
        "/api/ml — drop a trained best.pt into RoadVision/models/ to activate it."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# --- CORS: explicit allowlist, not "*", per the project's CORS rule. ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Consistent JSON error responses; no internal stack traces leak out. ---
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # 422 with a flattened, readable message instead of FastAPI's raw error list.
    messages = [f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}" for err in exc.errors()]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Invalid request data.", "errors": messages},
    )


@app.exception_handler(SQLAlchemyError)
async def db_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    logger.exception("Database error handling %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "A database error occurred. Please try again."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error handling %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred."},
    )


# --- Routers ---
app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(inspections.router, prefix=settings.api_prefix)
app.include_router(detections.router, prefix=settings.api_prefix)
app.include_router(dashboard.router, prefix=settings.api_prefix)
app.include_router(map_routes.router, prefix=settings.api_prefix)
app.include_router(analytics.router, prefix=settings.api_prefix)
app.include_router(ml.router, prefix=settings.api_prefix)

# --- Static files for frame screenshots and uploaded media ---
app.mount("/uploads", StaticFiles(directory=str(settings.upload_dir)), name="uploads")
