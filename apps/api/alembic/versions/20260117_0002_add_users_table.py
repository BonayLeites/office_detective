"""Add users table for authentication.

Revision ID: 0004
Revises: 0003
Create Date: 2026-01-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create users table and add foreign key constraints."""
    # Create users table
    op.create_table(
        "users",
        sa.Column(
            "user_id",
            sa.UUID(),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("preferred_language", sa.String(5), nullable=False, server_default="en"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Create index on email for fast lookups
    op.create_index("idx_users_email", "users", ["email"])

    # Add foreign key constraints to existing tables that reference user_id
    # Note: player_state and submissions tables already have user_id columns
    # but without foreign key constraints (per init.sql)
    op.create_foreign_key(
        "fk_player_state_user",
        "player_state",
        "users",
        ["user_id"],
        ["user_id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_submissions_user",
        "submissions",
        "users",
        ["user_id"],
        ["user_id"],
        ondelete="CASCADE",
    )

    # Create trigger for updated_at on users table
    op.execute("""
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade() -> None:
    """Drop users table and foreign key constraints."""
    # Drop trigger
    op.execute("DROP TRIGGER IF EXISTS update_users_updated_at ON users")

    # Drop foreign key constraints
    op.drop_constraint("fk_submissions_user", "submissions", type_="foreignkey")
    op.drop_constraint("fk_player_state_user", "player_state", type_="foreignkey")

    # Drop index
    op.drop_index("idx_users_email", "users")

    # Drop table
    op.drop_table("users")
