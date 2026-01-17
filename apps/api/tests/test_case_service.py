"""Tests for CaseService."""

import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Case, ScenarioType
from src.schemas.case import (
    CaseCreate,
    EvidenceRequirement,
    GroundTruth,
    TimelineEvent,
)
from src.services.case_service import CaseService


@pytest.fixture
async def case_service(db_session: AsyncSession) -> CaseService:
    """Create a CaseService instance for testing."""
    return CaseService(db_session)


@pytest.fixture
async def clean_cases(db_session: AsyncSession) -> None:
    """Clean all cases before test."""
    await db_session.execute(delete(Case))
    await db_session.commit()


@pytest.fixture
async def existing_case(db_session: AsyncSession) -> Case:
    """Create an existing case for testing."""
    case = Case(
        case_id=uuid.uuid4(),
        title="Existing Test Case",
        scenario_type=ScenarioType.vendor_fraud,
        difficulty=2,
        seed=11111,
        briefing="Existing case briefing",
        ground_truth_json={"culprits": [], "mechanism": "test"},
    )
    db_session.add(case)
    await db_session.commit()
    await db_session.refresh(case)
    return case


@pytest.fixture
def sample_case_create() -> CaseCreate:
    """Create sample CaseCreate data for testing."""
    culprit_id = uuid.uuid4()
    actor_id = uuid.uuid4()
    doc_id = uuid.uuid4()

    return CaseCreate(
        title="Service Created Case",
        scenario_type=ScenarioType.expense_fraud,
        difficulty=3,
        seed=22222,
        ground_truth=GroundTruth(
            culprit_entities=[culprit_id],
            mechanism="Expense fraud scheme",
            timeline=[
                TimelineEvent(
                    timestamp=datetime(2024, 2, 15, 10, 0, 0, tzinfo=UTC),
                    actor_entity_id=actor_id,
                    action="submitted_expense",
                    details="Submitted fraudulent expense",
                    evidence_doc_ids=[doc_id],
                )
            ],
            required_evidence=[
                EvidenceRequirement(
                    doc_id=doc_id,
                    rationale="Shows fraudulent expense",
                    strength="critical",
                )
            ],
            red_herrings=[],
        ),
    )


@pytest.mark.asyncio
async def test_service_get_by_id_found(case_service: CaseService, existing_case: Case) -> None:
    """CaseService.get_by_id returns case when it exists."""
    result = await case_service.get_by_id(existing_case.case_id)
    assert result is not None
    assert result.case_id == existing_case.case_id
    assert result.title == "Existing Test Case"
    assert result.scenario_type == ScenarioType.vendor_fraud


@pytest.mark.asyncio
async def test_service_get_by_id_not_found(case_service: CaseService) -> None:
    """CaseService.get_by_id returns None when case doesn't exist."""
    fake_id = uuid.uuid4()
    result = await case_service.get_by_id(fake_id)
    assert result is None


@pytest.mark.asyncio
async def test_service_list_cases_empty(case_service: CaseService, clean_cases: None) -> None:
    """CaseService.list_cases returns empty list when no cases."""
    result = await case_service.list_cases()
    assert result == []


@pytest.mark.asyncio
async def test_service_list_cases_with_data(case_service: CaseService, existing_case: Case) -> None:
    """CaseService.list_cases returns cases when they exist."""
    result = await case_service.list_cases()
    assert len(result) >= 1
    case_ids = [c.case_id for c in result]
    assert existing_case.case_id in case_ids


@pytest.mark.asyncio
async def test_service_list_cases_pagination(
    case_service: CaseService, db_session: AsyncSession, clean_cases: None
) -> None:
    """CaseService.list_cases respects pagination params."""
    # Create 5 cases
    for i in range(5):
        case = Case(
            case_id=uuid.uuid4(),
            title=f"List Test Case {i}",
            scenario_type=ScenarioType.vendor_fraud,
            difficulty=1,
            seed=i,
            briefing=f"Briefing {i}",
            ground_truth_json={"culprits": [], "mechanism": "test"},
        )
        db_session.add(case)
    await db_session.commit()

    # Test limit
    result = await case_service.list_cases(skip=0, limit=3)
    assert len(result) == 3

    # Test skip
    result = await case_service.list_cases(skip=2, limit=10)
    assert len(result) == 3  # 5 total - 2 skipped = 3


@pytest.mark.asyncio
async def test_service_create(
    case_service: CaseService,
    sample_case_create: CaseCreate,
    db_session: AsyncSession,
) -> None:
    """CaseService.create persists case to database."""
    result = await case_service.create(sample_case_create)

    assert result is not None
    assert result.title == "Service Created Case"
    assert result.scenario_type == ScenarioType.expense_fraud
    assert result.difficulty == 3
    assert result.seed == 22222
    assert result.case_id is not None

    # Verify it's actually in the database
    db_result = await db_session.execute(select(Case).where(Case.case_id == result.case_id))
    db_case = db_result.scalar_one_or_none()
    assert db_case is not None
    assert db_case.title == "Service Created Case"


@pytest.mark.asyncio
async def test_service_delete(
    case_service: CaseService, existing_case: Case, db_session: AsyncSession
) -> None:
    """CaseService.delete removes case from database."""
    case_id = existing_case.case_id

    await case_service.delete(existing_case)

    # Commit, expire session cache, and verify it's deleted
    await db_session.commit()
    db_session.expire_all()
    db_result = await db_session.execute(select(Case).where(Case.case_id == case_id))
    assert db_result.scalar_one_or_none() is None
