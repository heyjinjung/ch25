"""add v2 level reward table

Revision ID: 20260119_1000
Revises: 3bc52f37e0c0
Create Date: 2026-01-19 10:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260119_1000"
down_revision = "3bc52f37e0c0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "v2_level_reward_table",
        sa.Column("level", sa.Integer(), primary_key=True),
        sa.Column("required_xp", sa.Integer(), nullable=False),
        sa.Column("reward_type", sa.String(length=50), nullable=False),
        sa.Column("reward_amount", sa.Integer(), nullable=False),
        sa.Column("reward_payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("v2_level_reward_table")
