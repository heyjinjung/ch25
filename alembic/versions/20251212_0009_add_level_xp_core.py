"""Add core level XP tables.

Revision ID: 20251212_0009b
Revises: 20251212_0009a
Create Date: 2025-12-12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "20251212_0009b"
down_revision = "20251212_0009a"
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
    if not _table_exists("user_level_progress"):
        op.create_table(
            "user_level_progress",
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("xp", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        )

    if not _table_exists("user_level_reward_log"):
        op.create_table(
            "user_level_reward_log",
            sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
            sa.Column("level", sa.Integer(), nullable=False),
            sa.Column("reward_type", sa.String(length=50), nullable=False),
            sa.Column("reward_payload", sa.JSON(), nullable=True),
            sa.Column("auto_granted", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("granted_by", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.UniqueConstraint("user_id", "level", name="uq_user_level_reward"),
            sa.Index("idx_ulrl_user_created", "user_id", "created_at"),
        )

    if not _table_exists("user_xp_event_log"):
        op.create_table(
            "user_xp_event_log",
            sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
            sa.Column("source", sa.String(length=100), nullable=False),
            sa.Column("delta", sa.Integer(), nullable=False),
            sa.Column("meta", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Index("idx_uxel_user_created", "user_id", "created_at"),
        )


def downgrade() -> None:
    op.drop_table("user_xp_event_log")
    op.drop_table("user_level_reward_log")
    op.drop_table("user_level_progress")
