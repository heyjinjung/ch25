"""Add last_play_at to user_activity.

Revision ID: 20251216_0021
Revises: 20251216_0020
Create Date: 2025-12-16
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "20251216_0021"
down_revision = "20251216_0020"
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
    if _column_exists("user_activity", "last_play_at"):
        return

    op.add_column("user_activity", sa.Column("last_play_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    if _column_exists("user_activity", "last_play_at"):
        op.drop_column("user_activity", "last_play_at")
