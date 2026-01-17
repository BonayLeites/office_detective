"""Tests for cases API endpoints."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Case, Entity, EntityType, ScenarioType


@pytest.fixture
async def clean_cases(db_session: AsyncSession) -> None:
    """Clean all cases before test."""
    await db_session.execute(delete(Case))
    await db_session.commit()


@pytest.fixture
async def test_case(db_session: AsyncSession) -> Case:
    """Create a test case for API tests."""
    case = Case(
        case_id=uuid.uuid4(),
        title="API Test Case",
        scenario_type=ScenarioType.vendor_fraud,
        difficulty=3,
        seed=99999,
        briefing="Test briefing for API tests",
        ground_truth_json={
            "culprits": [{"entity_id": str(uuid.uuid4())}],
            "mechanism": "Test mechanism",
        },
    )
    db_session.add(case)
    await db_session.commit()
    await db_session.refresh(case)
    return case


@pytest.fixture
async def test_case_with_entities(
    db_session: AsyncSession, test_case: Case
) -> tuple[Case, list[Entity]]:
    """Create a test case with entities."""
    entities = []
    for i in range(3):
        entity = Entity(
            entity_id=uuid.uuid4(),
            case_id=test_case.case_id,
            entity_type=EntityType.person,
            name=f"Test Person {i}",
            attrs_json={"role": f"Role {i}"},
        )
        entities.append(entity)
        db_session.add(entity)
    await db_session.commit()
    return test_case, entities


@pytest.mark.asyncio
async def test_list_cases_empty(client: AsyncClient, clean_cases: None) -> None:
    """GET /api/cases returns empty list when no cases exist."""
    response = await client.get("/api/cases")
    assert response.status_code == 200
    data = response.json()
    assert data["cases"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_cases_with_data(
    client: AsyncClient, test_case: Case, db_session: AsyncSession
) -> None:
    """GET /api/cases returns cases with doc/entity counts."""
    response = await client.get("/api/cases")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1

    # Find our test case in the response
    case_data = next((c for c in data["cases"] if c["case_id"] == str(test_case.case_id)), None)
    assert case_data is not None
    assert case_data["title"] == "API Test Case"
    assert case_data["scenario_type"] == "vendor_fraud"
    assert case_data["difficulty"] == 3
    assert "document_count" in case_data
    assert "entity_count" in case_data


@pytest.mark.asyncio
async def test_list_cases_pagination(
    client: AsyncClient, db_session: AsyncSession, clean_cases: None
) -> None:
    """GET /api/cases respects skip and limit params."""
    # Create 5 cases
    for i in range(5):
        case = Case(
            case_id=uuid.uuid4(),
            title=f"Pagination Test Case {i}",
            scenario_type=ScenarioType.vendor_fraud,
            difficulty=2,
            seed=i,
            briefing=f"Briefing {i}",
            ground_truth_json={"culprits": [], "mechanism": "test"},
        )
        db_session.add(case)
    await db_session.commit()

    # Test limit
    response = await client.get("/api/cases?limit=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["cases"]) == 2
    assert data["total"] == 5

    # Test skip
    response = await client.get("/api/cases?skip=3&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data["cases"]) == 2  # 5 total, skip 3 = 2 remaining


@pytest.mark.asyncio
async def test_get_case_found(client: AsyncClient, test_case: Case) -> None:
    """GET /api/cases/{id} returns case with counts when found."""
    response = await client.get(f"/api/cases/{test_case.case_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["case_id"] == str(test_case.case_id)
    assert data["title"] == "API Test Case"
    assert data["scenario_type"] == "vendor_fraud"
    assert data["difficulty"] == 3
    assert data["document_count"] == 0
    assert data["entity_count"] == 0


@pytest.mark.asyncio
async def test_get_case_with_counts(
    client: AsyncClient, test_case_with_entities: tuple[Case, list[Entity]]
) -> None:
    """GET /api/cases/{id} returns correct entity count."""
    case, _entities = test_case_with_entities
    response = await client.get(f"/api/cases/{case.case_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["entity_count"] == 3


@pytest.mark.asyncio
async def test_get_case_not_found(client: AsyncClient) -> None:
    """GET /api/cases/{id} returns 404 for non-existent case."""
    fake_id = uuid.uuid4()
    response = await client.get(f"/api/cases/{fake_id}")
    assert response.status_code == 404
    data = response.json()
    assert "not found" in data["detail"].lower()


@pytest.mark.asyncio
async def test_create_case(client: AsyncClient, db_session: AsyncSession) -> None:
    """POST /api/cases creates case and returns 201."""
    culprit_id = str(uuid.uuid4())
    actor_id = str(uuid.uuid4())
    doc_id = str(uuid.uuid4())

    case_data = {
        "title": "New Created Case",
        "scenario_type": "data_leak",
        "difficulty": 4,
        "seed": 12345,
        "ground_truth": {
            "culprit_entities": [culprit_id],
            "mechanism": "Internal data breach",
            "timeline": [
                {
                    "timestamp": "2024-01-15T10:00:00Z",
                    "actor_entity_id": actor_id,
                    "action": "accessed_data",
                    "details": "Accessed sensitive files",
                    "evidence_doc_ids": [doc_id],
                }
            ],
            "required_evidence": [
                {
                    "doc_id": doc_id,
                    "rationale": "Shows unauthorized access",
                    "strength": "critical",
                }
            ],
            "red_herrings": [],
        },
    }

    response = await client.post("/api/cases", json=case_data)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "New Created Case"
    assert data["scenario_type"] == "data_leak"
    assert data["difficulty"] == 4
    assert data["seed"] == 12345
    assert "case_id" in data
    assert data["document_count"] == 0
    assert data["entity_count"] == 0

    # Verify case was actually created in database
    result = await db_session.execute(
        select(Case).where(Case.case_id == uuid.UUID(data["case_id"]))
    )
    created_case = result.scalar_one_or_none()
    assert created_case is not None
    assert created_case.title == "New Created Case"


@pytest.mark.asyncio
async def test_delete_case_found(
    client: AsyncClient, test_case: Case, db_session: AsyncSession
) -> None:
    """DELETE /api/cases/{id} returns 204 when case is found."""
    case_id = test_case.case_id

    response = await client.delete(f"/api/cases/{case_id}")
    assert response.status_code == 204

    # Commit and expire session cache, then verify case was deleted
    await db_session.commit()
    db_session.expire_all()
    result = await db_session.execute(select(Case).where(Case.case_id == case_id))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_case_not_found(client: AsyncClient) -> None:
    """DELETE /api/cases/{id} returns 404 for non-existent case."""
    fake_id = uuid.uuid4()
    response = await client.delete(f"/api/cases/{fake_id}")
    assert response.status_code == 404
    data = response.json()
    assert "not found" in data["detail"].lower()
