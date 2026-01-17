"""Tests for Mallory case seeding script."""

import pytest
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Case, DocType, Document, Entity, EntityType, ScenarioType
from src.scripts.seed_mallory import (
    MallorySeeder,
    generate_deterministic_uuid,
)


class TestDeterministicUUID:
    """Tests for UUID generation."""

    def test_same_input_same_output(self) -> None:
        """Same namespace and name always produce same UUID."""
        uuid1 = generate_deterministic_uuid("test", "entity1")
        uuid2 = generate_deterministic_uuid("test", "entity1")
        assert uuid1 == uuid2

    def test_different_input_different_output(self) -> None:
        """Different inputs produce different UUIDs."""
        uuid1 = generate_deterministic_uuid("test", "entity1")
        uuid2 = generate_deterministic_uuid("test", "entity2")
        uuid3 = generate_deterministic_uuid("other", "entity1")
        assert uuid1 != uuid2
        assert uuid1 != uuid3
        assert uuid2 != uuid3


@pytest.fixture
async def seeded_mallory(db_session: AsyncSession) -> None:
    """Ensure Mallory case is seeded."""
    case_id = generate_deterministic_uuid("mallory", "case_001_mallory")

    # Check if already seeded
    result = await db_session.execute(select(Case).where(Case.case_id == case_id))
    if result.scalar_one_or_none() is None:
        # Seed the case
        seeder = MallorySeeder(db_session)
        await seeder.seed_all()


class TestMallorySeeding:
    """Tests for Mallory case seeding."""

    @pytest.mark.asyncio
    async def test_seed_creates_case(self, db_session: AsyncSession) -> None:
        """Seed creates exactly 1 case."""
        case_id = generate_deterministic_uuid("mallory", "case_001_mallory")

        # Delete if exists
        await db_session.execute(delete(Case).where(Case.case_id == case_id))
        await db_session.commit()

        # Seed the case
        seeder = MallorySeeder(db_session)
        await seeder.seed_all()

        # Verify 1 case with correct data
        case_result = await db_session.execute(select(Case).where(Case.case_id == case_id))
        case = case_result.scalar_one_or_none()

        assert case is not None
        assert case.title == "The Mallory Procurement Irregularity"
        assert case.scenario_type == ScenarioType.vendor_fraud
        assert case.difficulty == 2
        assert case.seed == 42
        assert "Good morning" in case.briefing
        assert "culprits" in case.ground_truth_json

    @pytest.mark.asyncio
    async def test_seed_creates_all_entities(
        self, db_session: AsyncSession, seeded_mallory: None
    ) -> None:
        """Seed creates all 12 entities defined in YAML."""
        case_id = generate_deterministic_uuid("mallory", "case_001_mallory")

        # Count entities
        result = await db_session.execute(
            select(func.count()).select_from(Entity).where(Entity.case_id == case_id)
        )
        count = result.scalar()
        assert count == 12

        # Check entity type breakdown
        result = await db_session.execute(
            select(Entity.entity_type, func.count())
            .where(Entity.case_id == case_id)
            .group_by(Entity.entity_type)
        )
        type_counts = {row[0]: row[1] for row in result}

        assert type_counts[EntityType.person] == 7
        assert type_counts[EntityType.org] == 5

    @pytest.mark.asyncio
    async def test_seed_creates_key_entities(
        self, db_session: AsyncSession, seeded_mallory: None
    ) -> None:
        """Key entities like Marcus Chen and Sunshine Supplies exist."""
        # Check Marcus Chen (culprit)
        marcus_id = generate_deterministic_uuid("mallory", "P1")
        result = await db_session.execute(select(Entity).where(Entity.entity_id == marcus_id))
        marcus = result.scalar_one_or_none()
        assert marcus is not None
        assert marcus.name == "Marcus Chen"
        assert marcus.entity_type == EntityType.person
        assert marcus.attrs_json.get("role") == "Procurement Manager"

        # Check Sunshine Supplies (shell company)
        sunshine_id = generate_deterministic_uuid("mallory", "O2")
        result = await db_session.execute(select(Entity).where(Entity.entity_id == sunshine_id))
        sunshine = result.scalar_one_or_none()
        assert sunshine is not None
        assert sunshine.name == "Sunshine Supplies Ltd."
        assert sunshine.entity_type == EntityType.org
        assert sunshine.attrs_json.get("is_fraudulent") is True

    @pytest.mark.asyncio
    async def test_seed_creates_all_documents(
        self, db_session: AsyncSession, seeded_mallory: None
    ) -> None:
        """Seed creates all 19 documents defined in YAML."""
        case_id = generate_deterministic_uuid("mallory", "case_001_mallory")

        # Count documents
        result = await db_session.execute(
            select(func.count()).select_from(Document).where(Document.case_id == case_id)
        )
        count = result.scalar()
        assert count == 19

        # Check document type breakdown
        result = await db_session.execute(
            select(Document.doc_type, func.count())
            .where(Document.case_id == case_id)
            .group_by(Document.doc_type)
        )
        type_counts = {row[0]: row[1] for row in result}

        assert type_counts[DocType.email] == 4
        assert type_counts[DocType.invoice] == 5
        assert type_counts[DocType.chat] == 3
        assert type_counts[DocType.csv] == 2
        assert type_counts[DocType.note] == 4
        assert type_counts[DocType.ticket] == 1

    @pytest.mark.asyncio
    async def test_seed_creates_key_documents(
        self, db_session: AsyncSession, seeded_mallory: None
    ) -> None:
        """Key evidence documents exist with correct metadata."""
        # Check DOC-003 (familiar tone email - critical evidence)
        doc3_id = generate_deterministic_uuid("mallory", "DOC-003")
        result = await db_session.execute(select(Document).where(Document.doc_id == doc3_id))
        doc3 = result.scalar_one_or_none()
        assert doc3 is not None
        assert doc3.doc_type == DocType.email
        assert doc3.subject is not None
        assert "Invoice #4521" in doc3.subject
        assert doc3.metadata_json.get("is_key_evidence") is True
        assert doc3.metadata_json.get("relevance") == "critical"

        # Check DOC-010 (vendor registration - critical evidence)
        doc10_id = generate_deterministic_uuid("mallory", "DOC-010")
        result = await db_session.execute(select(Document).where(Document.doc_id == doc10_id))
        doc10 = result.scalar_one_or_none()
        assert doc10 is not None
        assert doc10.doc_type == DocType.note
        assert doc10.metadata_json.get("is_key_evidence") is True

    @pytest.mark.asyncio
    async def test_seed_links_document_authors(
        self, db_session: AsyncSession, seeded_mallory: None
    ) -> None:
        """Documents with from_entity have correct author links."""
        # DOC-001 is from Diana Walsh (P2)
        doc1_id = generate_deterministic_uuid("mallory", "DOC-001")
        diana_id = generate_deterministic_uuid("mallory", "P2")

        result = await db_session.execute(select(Document).where(Document.doc_id == doc1_id))
        doc1 = result.scalar_one_or_none()
        assert doc1 is not None
        assert doc1.author_entity_id == diana_id

    @pytest.mark.asyncio
    async def test_seed_idempotent(self, db_session: AsyncSession) -> None:
        """Running seed twice doesn't duplicate data."""
        case_id = generate_deterministic_uuid("mallory", "case_001_mallory")

        # First seed
        seeder1 = MallorySeeder(db_session)
        await seeder1.seed_all()

        # Get counts
        result = await db_session.execute(
            select(func.count()).select_from(Entity).where(Entity.case_id == case_id)
        )
        entity_count_1 = result.scalar()

        result = await db_session.execute(
            select(func.count()).select_from(Document).where(Document.case_id == case_id)
        )
        doc_count_1 = result.scalar()

        # Second seed (should not duplicate)
        seeder2 = MallorySeeder(db_session)
        await seeder2.seed_all()

        # Counts should be the same
        result = await db_session.execute(
            select(func.count()).select_from(Entity).where(Entity.case_id == case_id)
        )
        entity_count_2 = result.scalar()

        result = await db_session.execute(
            select(func.count()).select_from(Document).where(Document.case_id == case_id)
        )
        doc_count_2 = result.scalar()

        assert entity_count_1 == entity_count_2 == 12
        assert doc_count_1 == doc_count_2 == 19

    @pytest.mark.asyncio
    async def test_clear_removes_case(self, db_session: AsyncSession) -> None:
        """Deleting case cascades to entities and documents."""
        case_id = generate_deterministic_uuid("mallory", "case_001_mallory")

        # Ensure seeded
        seeder = MallorySeeder(db_session)
        await seeder.seed_all()

        # Verify exists
        result = await db_session.execute(select(Case).where(Case.case_id == case_id))
        case = result.scalar_one_or_none()
        assert case is not None

        # Delete the case
        await db_session.delete(case)
        await db_session.commit()

        # Verify gone
        result = await db_session.execute(select(Case).where(Case.case_id == case_id))
        assert result.scalar_one_or_none() is None

        # Verify cascade (entities gone)
        entity_count_result = await db_session.execute(
            select(func.count()).select_from(Entity).where(Entity.case_id == case_id)
        )
        assert entity_count_result.scalar() == 0

        # Verify cascade (documents gone)
        doc_count_result = await db_session.execute(
            select(func.count()).select_from(Document).where(Document.case_id == case_id)
        )
        assert doc_count_result.scalar() == 0

        # Re-seed for other tests
        seeder2 = MallorySeeder(db_session)
        await seeder2.seed_all()
