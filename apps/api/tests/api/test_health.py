"""Health endpoint tests."""

import pytest
from httpx import AsyncClient

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
