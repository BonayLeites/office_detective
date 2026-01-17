"""Case management endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from src.dependencies import DbSession
from src.models.case import Case
from src.models.document import Document, Entity
from src.schemas.case import CaseCreate, CaseListResponse, CaseResponse

router = APIRouter()


@router.get("", response_model=CaseListResponse)
async def list_cases(
    db: DbSession,
    skip: int = 0,
    limit: int = 20,
) -> CaseListResponse:
    """List all cases with pagination."""
    # Get total count
    count_result = await db.execute(select(func.count(Case.case_id)))
    total = count_result.scalar() or 0

    # Get cases with document and entity counts
    result = await db.execute(
        select(Case).order_by(Case.created_at.desc()).offset(skip).limit(limit)
    )
    cases = list(result.scalars().all())

    # Get counts for each case
    case_responses = []
    for case in cases:
        doc_count_result = await db.execute(
            select(func.count(Document.doc_id)).where(Document.case_id == case.case_id)
        )
        entity_count_result = await db.execute(
            select(func.count(Entity.entity_id)).where(Entity.case_id == case.case_id)
        )

        case_responses.append(
            CaseResponse(
                case_id=case.case_id,
                title=case.title,
                scenario_type=case.scenario_type,
                difficulty=case.difficulty,
                seed=case.seed,
                created_at=case.created_at,
                updated_at=case.updated_at,
                document_count=doc_count_result.scalar() or 0,
                entity_count=entity_count_result.scalar() or 0,
            )
        )

    return CaseListResponse(cases=case_responses, total=total)


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: UUID,
    db: DbSession,
) -> CaseResponse:
    """Get a specific case by ID."""
    result = await db.execute(select(Case).where(Case.case_id == case_id))
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found",
        )

    # Get counts
    doc_count_result = await db.execute(
        select(func.count(Document.doc_id)).where(Document.case_id == case_id)
    )
    entity_count_result = await db.execute(
        select(func.count(Entity.entity_id)).where(Entity.case_id == case_id)
    )

    return CaseResponse(
        case_id=case.case_id,
        title=case.title,
        scenario_type=case.scenario_type,
        difficulty=case.difficulty,
        seed=case.seed,
        created_at=case.created_at,
        updated_at=case.updated_at,
        document_count=doc_count_result.scalar() or 0,
        entity_count=entity_count_result.scalar() or 0,
    )


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    case_data: CaseCreate,
    db: DbSession,
) -> CaseResponse:
    """Create a new case."""
    case = Case(
        title=case_data.title,
        scenario_type=case_data.scenario_type,
        difficulty=case_data.difficulty,
        seed=case_data.seed,
        ground_truth_json=case_data.ground_truth.model_dump(mode="json"),
    )
    db.add(case)
    await db.flush()
    await db.refresh(case)

    return CaseResponse(
        case_id=case.case_id,
        title=case.title,
        scenario_type=case.scenario_type,
        difficulty=case.difficulty,
        seed=case.seed,
        created_at=case.created_at,
        updated_at=case.updated_at,
        document_count=0,
        entity_count=0,
    )


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(
    case_id: UUID,
    db: DbSession,
) -> None:
    """Delete a case."""
    result = await db.execute(select(Case).where(Case.case_id == case_id))
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found",
        )

    await db.delete(case)
