"""Add dice_config probability and cap columns.

Revision ID: 20260120_1410_add_dice_config_probability_columns
Revises: 20260120_1200_add_mission_reward_gifticon
Create Date: 2026-01-20
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260120_1410_add_dice_config_probability_columns"
down_revision = "20260120_1200_add_mission_reward_gifticon"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Existing databases created from the baseline snapshot may miss these columns.
    op.add_column(
        "dice_config",
        sa.Column("win_probability", sa.Float(), nullable=False, server_default="0.4"),
    )
    op.add_column(
        "dice_config",
        sa.Column("draw_probability", sa.Float(), nullable=False, server_default="0.1"),
    )
    op.add_column(
        "dice_config",
        sa.Column("lose_probability", sa.Float(), nullable=False, server_default="0.5"),
    )
    op.add_column(
        "dice_config",
        sa.Column("daily_gain_cap", sa.Integer(), nullable=False, server_default="20000"),
    )


def downgrade() -> None:
    op.drop_column("dice_config", "daily_gain_cap")
    op.drop_column("dice_config", "lose_probability")
    op.drop_column("dice_config", "draw_probability")
    op.drop_column("dice_config", "win_probability")
