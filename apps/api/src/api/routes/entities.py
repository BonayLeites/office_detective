"""Entity management endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from src.dependencies import DbSession
from src.models.document import EntityType
from src.schemas.entity import (
    EntityCreate,
    EntityListResponse,
    EntityResponse,
)
from src.services.entity_service import EntityService

router = APIRouter()


@router.get("", response_model=EntityListResponse)
async def list_entities(
    case_id: UUID,
    db: DbSession,
    skip: int = 0,
    limit: int = 50,
    entity_type: EntityType | None = None,
) -> EntityListResponse:
    """List entities for a case with pagination."""
    service = EntityService(db)

    entities = await service.list_by_case(case_id, skip, limit, entity_type)
    total = await service.count_by_case(case_id, entity_type)

    # Get document counts for each entity
    entity_responses = []
    for entity in entities:
        doc_count = await service.get_document_count(entity.entity_id)
        entity_responses.append(
            EntityResponse(
                entity_id=entity.entity_id,
                case_id=entity.case_id,
                entity_type=entity.entity_type,
                name=entity.name,
                attrs_json=entity.attrs_json,
                created_at=entity.created_at,
                updated_at=entity.updated_at,
                document_count=doc_count,
                mention_count=0,  # TODO: Implement mention counting
            )
        )

    return EntityListResponse(entities=entity_responses, total=total)


@router.get("/{entity_id}", response_model=EntityResponse)
async def get_entity(
    case_id: UUID,
    entity_id: UUID,
    db: DbSession,
) -> EntityResponse:
    """Get a specific entity by ID."""
    service = EntityService(db)
    entity = await service.get_by_id(entity_id)

    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity {entity_id} not found",
        )

    # Verify entity belongs to this case
    if entity.case_id != case_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity {entity_id} not found in case {case_id}",
        )

    doc_count = await service.get_document_count(entity_id)

    return EntityResponse(
        entity_id=entity.entity_id,
        case_id=entity.case_id,
        entity_type=entity.entity_type,
        name=entity.name,
        attrs_json=entity.attrs_json,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
        document_count=doc_count,
        mention_count=0,  # TODO: Implement mention counting
    )


@router.post("", response_model=EntityResponse, status_code=status.HTTP_201_CREATED)
async def create_entity(
    case_id: UUID,
    data: EntityCreate,
    db: DbSession,
) -> EntityResponse:
    """Create a new entity."""
    service = EntityService(db)
    entity = await service.create(case_id, data)

    return EntityResponse(
        entity_id=entity.entity_id,
        case_id=entity.case_id,
        entity_type=entity.entity_type,
        name=entity.name,
        attrs_json=entity.attrs_json,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
        document_count=0,
        mention_count=0,
    )


@router.delete("/{entity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entity(
    case_id: UUID,
    entity_id: UUID,
    db: DbSession,
) -> None:
    """Delete an entity."""
    service = EntityService(db)
    entity = await service.get_by_id(entity_id)

    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity {entity_id} not found",
        )

    # Verify entity belongs to this case
    if entity.case_id != case_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity {entity_id} not found in case {case_id}",
        )

    await service.delete(entity)
