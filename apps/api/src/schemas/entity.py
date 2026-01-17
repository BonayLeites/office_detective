"""Entity schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from src.models.document import EntityType


class EntityBase(BaseModel):
    """Base entity schema."""

    entity_type: EntityType
    name: str = Field(..., min_length=1, max_length=255)


class EntityCreate(EntityBase):
    """Schema for creating an entity."""

    attrs_json: dict[str, Any] = Field(default_factory=dict)


class EntityResponse(EntityBase):
    """Schema for entity response."""

    entity_id: UUID
    case_id: UUID
    attrs_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    document_count: int = 0
    mention_count: int = 0

    model_config = {"from_attributes": True}


class EntityListResponse(BaseModel):
    """Paginated entity list."""

    entities: list[EntityResponse]
    total: int
