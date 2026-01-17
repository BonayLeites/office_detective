"""Entity service for business logic."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.document import Document, Entity, EntityType
from src.schemas.entity import EntityCreate


class EntityService:
    """Service for entity-related operations."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialize service with database session."""
        self.db = db

    async def get_by_id(self, entity_id: UUID) -> Entity | None:
        """Get entity by ID."""
        result = await self.db.execute(select(Entity).where(Entity.entity_id == entity_id))
        return result.scalar_one_or_none()

    async def list_by_case(
        self,
        case_id: UUID,
        skip: int = 0,
        limit: int = 50,
        entity_type: EntityType | None = None,
    ) -> list[Entity]:
        """List entities for a case with pagination."""
        stmt = select(Entity).where(Entity.case_id == case_id)

        if entity_type is not None:
            stmt = stmt.where(Entity.entity_type == entity_type)

        stmt = stmt.order_by(Entity.name).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_by_case(
        self,
        case_id: UUID,
        entity_type: EntityType | None = None,
    ) -> int:
        """Count entities for a case."""
        stmt = select(func.count(Entity.entity_id)).where(Entity.case_id == case_id)

        if entity_type is not None:
            stmt = stmt.where(Entity.entity_type == entity_type)

        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def get_document_count(self, entity_id: UUID) -> int:
        """Get number of documents authored by this entity."""
        result = await self.db.execute(
            select(func.count(Document.doc_id)).where(Document.author_entity_id == entity_id)
        )
        return result.scalar() or 0

    async def create(self, case_id: UUID, data: EntityCreate) -> Entity:
        """Create a new entity."""
        entity = Entity(
            case_id=case_id,
            entity_type=data.entity_type,
            name=data.name,
            attrs_json=data.attrs_json,
        )
        self.db.add(entity)
        await self.db.flush()
        await self.db.refresh(entity)
        return entity

    async def delete(self, entity: Entity) -> None:
        """Delete an entity."""
        await self.db.delete(entity)
