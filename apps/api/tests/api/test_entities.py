"""Tests for entities API endpoints."""

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Case, DocType, Document, Entity, EntityType, ScenarioType


@pytest.fixture
async def test_case(db_session: AsyncSession) -> Case:
    """Create a test case for API tests."""
    case = Case(
        case_id=uuid.uuid4(),
        title="Entity Test Case",
        scenario_type=ScenarioType.expense_fraud,
        difficulty=3,
        seed=33333,
        briefing="Test briefing for entity tests",
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
async def test_entity(db_session: AsyncSession, test_case: Case) -> Entity:
    """Create a test entity for API tests."""
    entity = Entity(
        entity_id=uuid.uuid4(),
        case_id=test_case.case_id,
        entity_type=EntityType.person,
        name="Test Person",
        attrs_json={"email": "test@example.com", "role": "Manager"},
    )
    db_session.add(entity)
    await db_session.commit()
    await db_session.refresh(entity)
    return entity


@pytest.fixture
async def test_entity_with_documents(
    db_session: AsyncSession, test_case: Case, test_entity: Entity
) -> tuple[Entity, list[Document]]:
    """Create an entity with authored documents."""
    documents = []
    for i in range(2):
        doc = Document(
            doc_id=uuid.uuid4(),
            case_id=test_case.case_id,
            doc_type=DocType.email,
            ts=datetime.now(UTC),
            author_entity_id=test_entity.entity_id,
            subject=f"Email {i}",
            body=f"Body {i}",
        )
        documents.append(doc)
        db_session.add(doc)
    await db_session.commit()
    return test_entity, documents


@pytest.fixture
async def clean_entities(db_session: AsyncSession, test_case: Case) -> None:
    """Clean all entities for the test case."""
    await db_session.execute(delete(Entity).where(Entity.case_id == test_case.case_id))
    await db_session.commit()


@pytest.mark.asyncio
async def test_list_entities_empty(
    client: AsyncClient, test_case: Case, clean_entities: None
) -> None:
    """GET /api/cases/{case_id}/entities returns empty list when no entities."""
    response = await client.get(f"/api/cases/{test_case.case_id}/entities")
    assert response.status_code == 200
    data = response.json()
    assert data["entities"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_entities_with_data(
    client: AsyncClient, test_case: Case, test_entity: Entity
) -> None:
    """GET /api/cases/{case_id}/entities returns entities."""
    response = await client.get(f"/api/cases/{test_case.case_id}/entities")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1

    # Find our test entity
    entity_data = next(
        (e for e in data["entities"] if e["entity_id"] == str(test_entity.entity_id)), None
    )
    assert entity_data is not None
    assert entity_data["entity_type"] == "person"
    assert entity_data["name"] == "Test Person"
    assert entity_data["attrs_json"]["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_list_entities_filter_by_type(
    client: AsyncClient, test_case: Case, test_entity: Entity, db_session: AsyncSession
) -> None:
    """GET /api/cases/{case_id}/entities filters by entity_type."""
    # Create an org entity
    org_entity = Entity(
        entity_id=uuid.uuid4(),
        case_id=test_case.case_id,
        entity_type=EntityType.org,
        name="Test Organization",
        attrs_json={"industry": "Tech"},
    )
    db_session.add(org_entity)
    await db_session.commit()

    # Filter for persons only
    response = await client.get(
        f"/api/cases/{test_case.case_id}/entities", params={"entity_type": "person"}
    )
    assert response.status_code == 200
    data = response.json()

    for entity in data["entities"]:
        assert entity["entity_type"] == "person"


@pytest.mark.asyncio
async def test_list_entities_pagination(
    client: AsyncClient, test_case: Case, db_session: AsyncSession, clean_entities: None
) -> None:
    """GET /api/cases/{case_id}/entities respects skip and limit."""
    # Create 5 entities with names that sort predictably
    for i in range(5):
        entity = Entity(
            entity_id=uuid.uuid4(),
            case_id=test_case.case_id,
            entity_type=EntityType.person,
            name=f"Person {i:02d}",
            attrs_json={},
        )
        db_session.add(entity)
    await db_session.commit()

    # Get first 2
    response = await client.get(f"/api/cases/{test_case.case_id}/entities", params={"limit": 2})
    assert response.status_code == 200
    data = response.json()
    assert len(data["entities"]) == 2
    assert data["total"] == 5

    # Skip 2, get next 2
    response = await client.get(
        f"/api/cases/{test_case.case_id}/entities", params={"skip": 2, "limit": 2}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["entities"]) == 2


@pytest.mark.asyncio
async def test_get_entity_found(client: AsyncClient, test_case: Case, test_entity: Entity) -> None:
    """GET /api/cases/{case_id}/entities/{entity_id} returns entity when found."""
    response = await client.get(f"/api/cases/{test_case.case_id}/entities/{test_entity.entity_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["entity_id"] == str(test_entity.entity_id)
    assert data["entity_type"] == "person"
    assert data["name"] == "Test Person"


@pytest.mark.asyncio
async def test_get_entity_with_document_count(
    client: AsyncClient, test_case: Case, test_entity_with_documents: tuple[Entity, list[Document]]
) -> None:
    """GET /api/cases/{case_id}/entities/{entity_id} returns document count."""
    entity, _documents = test_entity_with_documents
    response = await client.get(f"/api/cases/{test_case.case_id}/entities/{entity.entity_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["document_count"] == 2


@pytest.mark.asyncio
async def test_get_entity_not_found(client: AsyncClient, test_case: Case) -> None:
    """GET /api/cases/{case_id}/entities/{entity_id} returns 404 when not found."""
    fake_id = uuid.uuid4()
    response = await client.get(f"/api/cases/{test_case.case_id}/entities/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_entity_wrong_case(
    client: AsyncClient, test_case: Case, test_entity: Entity, db_session: AsyncSession
) -> None:
    """GET /api/cases/{case_id}/entities/{entity_id} returns 404 for wrong case."""
    # Create another case
    other_case = Case(
        case_id=uuid.uuid4(),
        title="Other Case",
        scenario_type=ScenarioType.data_leak,
        difficulty=1,
        seed=44444,
        ground_truth_json={"culprits": [], "mechanism": "Test"},
    )
    db_session.add(other_case)
    await db_session.commit()

    # Try to access entity from wrong case
    response = await client.get(f"/api/cases/{other_case.case_id}/entities/{test_entity.entity_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_entity(client: AsyncClient, test_case: Case) -> None:
    """POST /api/cases/{case_id}/entities creates a new entity."""
    entity_data = {
        "entity_type": "person",
        "name": "New Person",
        "attrs_json": {"email": "new@example.com", "department": "Engineering"},
    }
    response = await client.post(f"/api/cases/{test_case.case_id}/entities", json=entity_data)
    assert response.status_code == 201
    data = response.json()
    assert data["entity_type"] == "person"
    assert data["name"] == "New Person"
    assert data["case_id"] == str(test_case.case_id)
    assert data["document_count"] == 0
    assert data["attrs_json"]["email"] == "new@example.com"


@pytest.mark.asyncio
async def test_create_entity_org(client: AsyncClient, test_case: Case) -> None:
    """POST /api/cases/{case_id}/entities creates an org entity."""
    entity_data = {
        "entity_type": "org",
        "name": "Acme Corp",
        "attrs_json": {"industry": "Manufacturing", "iban": "DE89370400440532013000"},
    }
    response = await client.post(f"/api/cases/{test_case.case_id}/entities", json=entity_data)
    assert response.status_code == 201
    data = response.json()
    assert data["entity_type"] == "org"
    assert data["name"] == "Acme Corp"


@pytest.mark.asyncio
async def test_create_entity_validation_error(client: AsyncClient, test_case: Case) -> None:
    """POST /api/cases/{case_id}/entities returns 422 for invalid data."""
    # Missing required field 'name'
    entity_data = {
        "entity_type": "person",
    }
    response = await client.post(f"/api/cases/{test_case.case_id}/entities", json=entity_data)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_entity_name_too_long(client: AsyncClient, test_case: Case) -> None:
    """POST /api/cases/{case_id}/entities returns 422 for name too long."""
    entity_data = {
        "entity_type": "person",
        "name": "A" * 300,  # Over 255 limit
    }
    response = await client.post(f"/api/cases/{test_case.case_id}/entities", json=entity_data)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_delete_entity(
    client: AsyncClient, test_case: Case, test_entity: Entity, db_session: AsyncSession
) -> None:
    """DELETE /api/cases/{case_id}/entities/{entity_id} removes entity."""
    entity_id = test_entity.entity_id

    response = await client.delete(f"/api/cases/{test_case.case_id}/entities/{entity_id}")
    assert response.status_code == 204

    # Verify entity is deleted
    await db_session.commit()
    db_session.expire_all()
    result = await db_session.execute(select(Entity).where(Entity.entity_id == entity_id))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_entity_not_found(client: AsyncClient, test_case: Case) -> None:
    """DELETE /api/cases/{case_id}/entities/{entity_id} returns 404 when not found."""
    fake_id = uuid.uuid4()
    response = await client.delete(f"/api/cases/{test_case.case_id}/entities/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_entity_sets_document_author_null(
    client: AsyncClient,
    test_case: Case,
    test_entity_with_documents: tuple[Entity, list[Document]],
    db_session: AsyncSession,
) -> None:
    """DELETE entity sets author_entity_id to NULL on related documents."""
    entity, documents = test_entity_with_documents
    doc_ids = [d.doc_id for d in documents]

    response = await client.delete(f"/api/cases/{test_case.case_id}/entities/{entity.entity_id}")
    assert response.status_code == 204

    # Verify documents still exist but author is NULL
    await db_session.commit()
    db_session.expire_all()
    for doc_id in doc_ids:
        result = await db_session.execute(select(Document).where(Document.doc_id == doc_id))
        doc = result.scalar_one_or_none()
        assert doc is not None
        assert doc.author_entity_id is None
