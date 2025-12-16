"""Add user_activity_event table for activity idempotency.

Revision ID: 20251216_0019
Revises: 20251216_0018
Create Date: 2025-12-16
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "20251216_0019"
down_revision = "20251216_0018"
branch_labels = None
depends_on = None


def _table_exists(table: str) -> bool:
    conn = op.get_bind()
    return bool(
        conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = DATABASE()
                  AND table_name = :table
                """
            ),
            {"table": table},
        ).scalar()
    )


def upgrade() -> None:
    if _table_exists("user_activity_event"):
        return

    op.create_table(
        "user_activity_event",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("event_id", sa.String(length=36), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("event_id", name="uq_user_activity_event_event_id"),
    )
    op.create_index(
        "ix_user_activity_event_user_created",
        "user_activity_event",
        ["user_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    if _table_exists("user_activity_event"):
        op.drop_index("ix_user_activity_event_user_created", table_name="user_activity_event")
        op.drop_table("user_activity_event")
