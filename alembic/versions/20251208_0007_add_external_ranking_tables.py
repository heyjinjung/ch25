"""Add external ranking data and reward log tables.

Revision ID: 20251208_0007
Revises: 20251207_0006
Create Date: 2025-12-08
"""
from alembic import op
import sqlalchemy as sa

revision = "20251208_0007"
down_revision = "20251207_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "external_ranking_data",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.Integer(), nullable=False, index=True),
        sa.Column("deposit_amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("play_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("memo", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
            onupdate=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("user_id", name="uq_external_ranking_user"),
    )

    op.create_table(
        "external_ranking_reward_log",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.Integer(), nullable=False, index=True),
        sa.Column("reward_type", sa.String(length=50), nullable=False),
        sa.Column("reward_amount", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(length=100), nullable=False),
        sa.Column("season_name", sa.String(length=50), nullable=False),
        sa.Column("data_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )


def downgrade() -> None:
    op.drop_table("external_ranking_reward_log")
    op.drop_table("external_ranking_data")
