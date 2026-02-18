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


class CustomCaseCreateRequest(BaseModel):
    """Schema for creating a user-customized case via guided inputs."""

    idea: str = Field(..., min_length=12, max_length=3000)
    scenario_type: ScenarioType = ScenarioType.vendor_fraud
    difficulty: int = Field(default=2, ge=1, le=5)
    language: str = Field(default="en", pattern=r"^[a-z]{2}$")
    company_name: str | None = Field(default=None, min_length=2, max_length=120)
    culprit_name: str | None = Field(default=None, min_length=2, max_length=120)
    people_names: list[str] = Field(default_factory=list)
    generate_embeddings: bool = True
    sync_graph: bool = True


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


class CustomCaseCreateResponse(BaseModel):
    """Response for custom case creation."""

    case: CaseResponse
    entities_created: int
    documents_created: int
    chunks_created: int = 0
    embeddings_created: int = 0
    graph_relationships_created: int = 0
    warnings: list[str] = Field(default_factory=list)
