"""Case model."""

from enum import Enum as PyEnum
from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import CheckConstraint, Enum, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.document import Document, Entity


class ScenarioType(PyEnum):
    """Valid scenario types for cases."""

    vendor_fraud = "vendor_fraud"
    data_leak = "data_leak"
    inventory_manipulation = "inventory_manipulation"
    internal_sabotage = "internal_sabotage"
    expense_fraud = "expense_fraud"


class Case(Base, TimestampMixin):
    """Investigation case model."""

    __tablename__ = "cases"

    case_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default="uuid_generate_v4()",
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    scenario_type: Mapped[ScenarioType] = mapped_column(
        Enum(ScenarioType, name="scenario_type", create_type=False),
        nullable=False,
    )
    difficulty: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    seed: Mapped[int] = mapped_column(Integer, nullable=False)
    briefing: Mapped[str] = mapped_column(Text, nullable=False, default="")
    ground_truth_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)

    # Relationships
    documents: Mapped[list["Document"]] = relationship(
        "Document",
        back_populates="case",
        cascade="all, delete-orphan",
    )
    entities: Mapped[list["Entity"]] = relationship(
        "Entity",
        back_populates="case",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint("difficulty >= 1 AND difficulty <= 5", name="check_difficulty_range"),
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<Case {self.title} (difficulty={self.difficulty})>"
