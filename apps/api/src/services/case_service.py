"""Case service for business logic."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.case import Case
from src.schemas.case import CaseCreate


class CaseService:
    """Service for case-related operations."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialize service with database session."""
        self.db = db

    async def get_by_id(self, case_id: UUID) -> Case | None:
        """Get case by ID."""
        result = await self.db.execute(select(Case).where(Case.case_id == case_id))
        return result.scalar_one_or_none()

    async def list_cases(
        self,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Case]:
        """List cases with pagination."""
        result = await self.db.execute(
            select(Case).order_by(Case.created_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, data: CaseCreate) -> Case:
        """Create a new case."""
        case = Case(
            title=data.title,
            scenario_type=data.scenario_type,
            difficulty=data.difficulty,
            seed=data.seed,
            ground_truth_json=data.ground_truth.model_dump(mode="json"),
        )
        self.db.add(case)
        await self.db.flush()
        await self.db.refresh(case)
        return case

    async def delete(self, case: Case) -> None:
        """Delete a case."""
        await self.db.delete(case)
