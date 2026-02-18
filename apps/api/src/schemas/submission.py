"""Schemas for player progress and case submissions."""

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class SubmissionRequest(BaseModel):
    """Request payload for final case submission."""

    culprit_ids: list[UUID] = Field(..., min_length=1)
    evidence_ids: list[UUID] = Field(default_factory=list)
    explanation: str = Field(..., min_length=20, max_length=5000)


class ScoreBreakdown(BaseModel):
    """Score components for submission feedback."""

    culprit_score: int
    evidence_score: int
    explanation_score: int
    efficiency_score: int
    board_reasoning_score: int = 0


class SubmissionResponse(BaseModel):
    """Result returned after evaluating a submission."""

    submission_id: UUID | None = None
    score: int
    max_score: int = 100
    correct_culprits: list[UUID] = Field(default_factory=list)
    feedback: str
    breakdown: ScoreBreakdown


class ProgressResponse(BaseModel):
    """Current player progress for a case."""

    hints_used: int
    hints_remaining: int
    has_submission: bool
    last_score: int | None = None


class BoardStateRequest(BaseModel):
    """Request payload for persisting board state."""

    board_items: list[dict[str, Any]] = Field(default_factory=list)
    board_edges: list[dict[str, Any]] = Field(default_factory=list)


class BoardStateResponse(BaseModel):
    """Persisted board state for a player in a case."""

    board_items: list[dict[str, Any]] = Field(default_factory=list)
    board_edges: list[dict[str, Any]] = Field(default_factory=list)
    updated_at: str | None = None
