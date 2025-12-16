"""Add segment_rule table for DB-managed segmentation rules.

Revision ID: 20251216_0020
Revises: 20251216_0019
Create Date: 2025-12-16
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "20251216_0020"
down_revision = "20251216_0019"
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
    if _table_exists("segment_rule"):
        return

    op.create_table(
        "segment_rule",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("segment", sa.String(length=50), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("condition_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
            onupdate=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("name", name="uq_segment_rule_name"),
    )


def downgrade() -> None:
    if _table_exists("segment_rule"):
        op.drop_table("segment_rule")
