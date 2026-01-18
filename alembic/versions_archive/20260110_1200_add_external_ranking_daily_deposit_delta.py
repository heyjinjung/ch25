"""Add external ranking daily deposit delta table.

Revision ID: 20260110_1200_ext_rank_delta
Revises: 20260106_0730_add_user_streak
Create Date: 2026-01-10 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = "20260110_1200_ext_rank_delta"
down_revision = "20260106_0730_add_user_streak"
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
    if _table_exists("external_ranking_daily_deposit_delta"):
        return

    op.create_table(
        "external_ranking_daily_deposit_delta",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("kst_date", sa.Date(), nullable=False, index=True),
        sa.Column("deposit_delta", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
            onupdate=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("user_id", "kst_date", name="uq_ext_rank_daily_deposit_user_date"),
    )


def downgrade() -> None:
    if _table_exists("external_ranking_daily_deposit_delta"):
        op.drop_table("external_ranking_daily_deposit_delta")
