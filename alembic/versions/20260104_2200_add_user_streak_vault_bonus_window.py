"""add user streak vault bonus window fields

Revision ID: 20260104_2200_add_user_streak_vault_bonus_window
Revises: 20260104_2100_add_user_play_streak_fields
Create Date: 2026-01-04 22:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260104_2200_add_user_streak_vault_bonus_window"
down_revision = "20260104_2100_add_user_play_streak_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column("streak_vault_bonus_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "user",
        sa.Column("streak_vault_bonus_started_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user", "streak_vault_bonus_started_at")
    op.drop_column("user", "streak_vault_bonus_date")
