"""Initial baseline - stamp existing schema.

Revision ID: 0001
Revises:
Create Date: 2026-01-16

This migration establishes a baseline for the existing database schema
created by infra/postgres/init.sql. It adds the briefing column to cases.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade database schema."""
    # Add briefing column to cases table
    op.add_column(
        "cases",
        sa.Column("briefing", sa.Text(), nullable=False, server_default=""),
    )
    # Remove server_default after adding
    op.alter_column("cases", "briefing", server_default=None)


def downgrade() -> None:
    """Downgrade database schema."""
    op.drop_column("cases", "briefing")
