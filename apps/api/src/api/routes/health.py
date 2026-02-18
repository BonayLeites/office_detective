"""Health check endpoints."""

from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text

from src.config import settings
from src.db.neo4j import verify_neo4j_connection
from src.dependencies import DbSession

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str


class DependencyStatus(BaseModel):
    """Health status for one dependency."""

    status: Literal["ok", "degraded", "missing"]
    detail: str | None = None


class DependencyHealthResponse(BaseModel):
    """Aggregated dependency health response."""

    status: Literal["healthy", "degraded"]
    version: str
    dependencies: dict[str, DependencyStatus]


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Check API health status."""
    return HealthResponse(status="healthy", version="0.1.0")


@router.get("/health/dependencies", response_model=DependencyHealthResponse)
async def dependency_health_check(db: DbSession) -> DependencyHealthResponse:
    """Check runtime dependency status for demo and operations dashboards."""
    dependencies: dict[str, DependencyStatus] = {}

    try:
        await db.execute(text("SELECT 1"))
        dependencies["database"] = DependencyStatus(status="ok")
    except Exception:
        dependencies["database"] = DependencyStatus(
            status="degraded",
            detail="Database query failed",
        )

    neo4j_ok = await verify_neo4j_connection()
    dependencies["neo4j"] = (
        DependencyStatus(status="ok")
        if neo4j_ok
        else DependencyStatus(status="degraded", detail="Neo4j connection failed")
    )

    primary_provider = settings.normalized_provider()
    llm_key = settings.provider_api_key(primary_provider).strip()
    llm_detail = f"{primary_provider}:{settings.provider_model_name(primary_provider)}"
    fallback_provider = settings.llm_fallback_provider.strip().lower()
    if (
        fallback_provider
        and fallback_provider != primary_provider
        and settings.provider_is_configured(fallback_provider)
    ):
        llm_detail = (
            f"{llm_detail} (fallback: {fallback_provider}:"
            f"{settings.provider_model_name(fallback_provider)})"
        )

    dependencies["llm"] = (
        DependencyStatus(
            status="ok",
            detail=llm_detail,
        )
        if llm_key
        else DependencyStatus(
            status="missing",
            detail="Configure OPENAI_API_KEY or DEEPSEEK_API_KEY",
        )
    )

    embedding_key = settings.resolved_embedding_api_key.strip()
    dependencies["embeddings"] = (
        DependencyStatus(status="ok", detail=settings.embedding_model)
        if embedding_key
        else DependencyStatus(
            status="missing",
            detail="Configure EMBEDDING_API_KEY or OPENAI_API_KEY",
        )
    )

    overall_status: Literal["healthy", "degraded"] = (
        "healthy" if all(dep.status == "ok" for dep in dependencies.values()) else "degraded"
    )

    return DependencyHealthResponse(
        status=overall_status,
        version="0.1.0",
        dependencies=dependencies,
    )


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
