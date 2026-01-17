"""Add language support to cases, documents, and chunks.

Revision ID: 0003
Revises: 0002
Create Date: 2026-01-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add language columns to cases, documents, and doc_chunks tables."""
    # Add language column to cases
    op.add_column(
        "cases",
        sa.Column("language", sa.String(5), nullable=False, server_default="en"),
    )

    # Add language column to documents
    op.add_column(
        "documents",
        sa.Column("language", sa.String(5), nullable=False, server_default="en"),
    )

    # Add language column to doc_chunks
    op.add_column(
        "doc_chunks",
        sa.Column("language", sa.String(5), nullable=False, server_default="en"),
    )

    # Create indexes for efficient language-scoped queries
    op.create_index("idx_cases_language", "cases", ["language"])
    op.create_index("idx_documents_case_lang", "documents", ["case_id", "language"])
    op.create_index("idx_chunks_case_lang", "doc_chunks", ["case_id", "language"])


def downgrade() -> None:
    """Remove language columns and indexes."""
    # Drop indexes
    op.drop_index("idx_chunks_case_lang", "doc_chunks")
    op.drop_index("idx_documents_case_lang", "documents")
    op.drop_index("idx_cases_language", "cases")

    # Drop columns
    op.drop_column("doc_chunks", "language")
    op.drop_column("documents", "language")
    op.drop_column("cases", "language")
