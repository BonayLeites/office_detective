"""Health check endpoints."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text

from src.dependencies import DbSession

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Check API health status."""
    return HealthResponse(status="healthy", version="0.1.0")


@router.get("/ready")
async def readiness_check(db: DbSession) -> dict[str, str]:
    """Check if API is ready to serve requests."""
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not ready",
        ) from e

    return {"status": "ready"}
