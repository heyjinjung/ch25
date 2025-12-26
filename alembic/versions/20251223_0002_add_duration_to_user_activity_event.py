"""Add duration_seconds to user_activity_event for play session tracking.

Revision ID: 20251223_0002
Revises: 20251222_0001
Create Date: 2025-12-23

Adds nullable duration_seconds to store PLAY_DURATION payloads for session length metrics.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "20251223_0002"
down_revision = "20251222_0001"
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    return bool(
        conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = :table
                  AND column_name = :column
                """
            ),
            {"table": table, "column": column},
        ).scalar()
    )


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name if bind and bind.dialect else ""

    if dialect == "sqlite":
        with op.batch_alter_table("user_activity_event") as batch:
            batch.add_column(sa.Column("duration_seconds", sa.Integer(), nullable=True))
        return

    if not _column_exists("user_activity_event", "duration_seconds"):
        op.add_column("user_activity_event", sa.Column("duration_seconds", sa.Integer(), nullable=True))


def downgrade() -> None:
    # Safe no-op downgrade to avoid accidental data loss.
    return
