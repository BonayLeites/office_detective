"""Health endpoint tests."""

from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from src.api.routes import health as health_routes
from src.config import settings
from src.dependencies import get_db
from src.main import app


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient) -> None:
    """Test health check endpoint returns healthy status."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


@pytest.mark.asyncio
async def test_readiness_check(client: AsyncClient) -> None:
    """Test readiness endpoint returns ready status."""
    response = await client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"


@pytest.mark.asyncio
async def test_readiness_check_db_unavailable(client: AsyncClient) -> None:
    """Readiness endpoint returns 503 when DB query fails."""

    class BrokenSession:
        async def execute(self, _query: object) -> None:
            raise RuntimeError("db down")

    async def override_get_db() -> BrokenSession:
        return BrokenSession()

    app.dependency_overrides[get_db] = override_get_db
    try:
        response = await client.get("/ready")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json()["detail"] == "Database is not ready"


@pytest.mark.asyncio
async def test_dependency_health_check_healthy(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Dependency endpoint reports healthy when critical dependencies are available."""
    original_llm_provider = settings.llm_provider
    original_openai_key = settings.openai_api_key
    original_deepseek_key = settings.deepseek_api_key
    original_embedding_key = settings.embedding_api_key

    monkeypatch.setattr(settings, "llm_provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "test-openai-key")
    monkeypatch.setattr(settings, "deepseek_api_key", "")
    monkeypatch.setattr(settings, "embedding_api_key", "test-embedding-key")
    monkeypatch.setattr(
        health_routes,
        "verify_neo4j_connection",
        AsyncMock(return_value=True),
    )

    try:
        response = await client.get("/health/dependencies")
    finally:
        settings.llm_provider = original_llm_provider
        settings.openai_api_key = original_openai_key
        settings.deepseek_api_key = original_deepseek_key
        settings.embedding_api_key = original_embedding_key

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["dependencies"]["database"]["status"] == "ok"
    assert data["dependencies"]["neo4j"]["status"] == "ok"
    assert data["dependencies"]["llm"]["status"] == "ok"
    assert data["dependencies"]["embeddings"]["status"] == "ok"


@pytest.mark.asyncio
async def test_dependency_health_check_degraded(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Dependency endpoint reports degraded when required systems are unavailable."""
    original_llm_provider = settings.llm_provider
    original_openai_key = settings.openai_api_key
    original_deepseek_key = settings.deepseek_api_key
    original_embedding_key = settings.embedding_api_key

    class BrokenSession:
        async def execute(self, _query: object) -> None:
            raise RuntimeError("db down")

    async def override_get_db() -> BrokenSession:
        return BrokenSession()

    monkeypatch.setattr(settings, "llm_provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "")
    monkeypatch.setattr(settings, "deepseek_api_key", "")
    monkeypatch.setattr(settings, "embedding_api_key", "")
    monkeypatch.setattr(
        health_routes,
        "verify_neo4j_connection",
        AsyncMock(return_value=False),
    )
    app.dependency_overrides[get_db] = override_get_db

    try:
        response = await client.get("/health/dependencies")
    finally:
        app.dependency_overrides.clear()
        settings.llm_provider = original_llm_provider
        settings.openai_api_key = original_openai_key
        settings.deepseek_api_key = original_deepseek_key
        settings.embedding_api_key = original_embedding_key

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "degraded"
    assert data["dependencies"]["database"]["status"] == "degraded"
    assert data["dependencies"]["neo4j"]["status"] == "degraded"
    assert data["dependencies"]["llm"]["status"] == "missing"
    assert data["dependencies"]["embeddings"]["status"] == "missing"
