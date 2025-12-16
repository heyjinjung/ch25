"""Add user_activity and user_segment tables for personalization.

Revision ID: 20251216_0018
Revises: 20251216_0017
Create Date: 2025-12-16
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "20251216_0018"
down_revision = "20251216_0017"
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
    if not _table_exists("user_activity"):
        op.create_table(
            "user_activity",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("last_login_at", sa.DateTime(), nullable=True),
            sa.Column("last_charge_at", sa.DateTime(), nullable=True),
            sa.Column("roulette_plays", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("dice_plays", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("lottery_plays", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("total_play_duration", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("last_bonus_used_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
                onupdate=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.UniqueConstraint("user_id", name="uq_user_activity_user"),
        )
        op.create_index("ix_user_activity_user_updated_at", "user_activity", ["user_id", "updated_at"], unique=False)

    if not _table_exists("user_segment"):
        op.create_table(
            "user_segment",
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("segment", sa.String(length=50), nullable=False, server_default="NEW"),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
                onupdate=sa.text("CURRENT_TIMESTAMP"),
            ),
        )


def downgrade() -> None:
    if _table_exists("user_segment"):
        op.drop_table("user_segment")
    if _table_exists("user_activity"):
        op.drop_index("ix_user_activity_user_updated_at", table_name="user_activity")
        op.drop_table("user_activity")
