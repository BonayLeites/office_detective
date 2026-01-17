"""Add updated_at columns to entities and documents.

Revision ID: 20260116_0002
Revises: 20260116_0001
Create Date: 2026-01-16 19:30:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add updated_at columns."""
    # Add updated_at to entities
    op.add_column(
        "entities",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # Add updated_at to documents
    op.add_column(
        "documents",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # Create trigger for entities
    op.execute(
        """
        CREATE TRIGGER update_entities_updated_at
            BEFORE UPDATE ON entities
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """
    )

    # Create trigger for documents
    op.execute(
        """
        CREATE TRIGGER update_documents_updated_at
            BEFORE UPDATE ON documents
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """
    )


def downgrade() -> None:
    """Remove updated_at columns."""
    op.execute("DROP TRIGGER IF EXISTS update_documents_updated_at ON documents")
    op.execute("DROP TRIGGER IF EXISTS update_entities_updated_at ON entities")

    op.drop_column("documents", "updated_at")
    op.drop_column("entities", "updated_at")
