"""Case schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from src.models.case import ScenarioType


class TimelineEvent(BaseModel):
    """Timeline event in ground truth."""

    timestamp: datetime
    actor_entity_id: UUID
    action: str
    details: str
    evidence_doc_ids: list[UUID] = Field(default_factory=list)


class EvidenceRequirement(BaseModel):
    """Evidence requirement in ground truth."""

    doc_id: UUID | None = None
    pattern: str | None = None
    rationale: str
    strength: str  # critical, supporting, circumstantial


class GroundTruth(BaseModel):
    """Ground truth for case validation."""

    culprit_entities: list[UUID]
    mechanism: str
    timeline: list[TimelineEvent]
    required_evidence: list[EvidenceRequirement]
    red_herrings: list[dict[str, Any]] = Field(default_factory=list)


class CaseBase(BaseModel):
    """Base case schema."""

    title: str = Field(..., min_length=1, max_length=255)
    scenario_type: ScenarioType
    difficulty: int = Field(..., ge=1, le=5)
    language: str = Field(default="en", pattern=r"^[a-z]{2}$")


class CaseCreate(CaseBase):
    """Schema for creating a case."""

    seed: int
    ground_truth: GroundTruth


class CaseResponse(CaseBase):
    """Schema for case response."""

    case_id: UUID
    seed: int
    created_at: datetime
    updated_at: datetime
    document_count: int = 0
    entity_count: int = 0

    model_config = {"from_attributes": True}


class CaseListResponse(BaseModel):
    """Schema for case list response."""

    cases: list[CaseResponse]
    total: int
