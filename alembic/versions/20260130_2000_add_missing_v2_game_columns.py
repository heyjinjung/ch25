"""Add missing columns to v2_dice_config and v2_lottery_config.

Revision ID: 20260130_2000_add_missing_v2_game_columns
Revises: 20260130_1900_fk_v2_user
Create Date: 2026-01-30

This migration adds columns that were present in the model but missing from
the original v2_game_tables migration (20260119_1500).
"""

from alembic import op
import sqlalchemy as sa


revision = "20260130_2000_add_missing_v2_game_columns"
down_revision = "20260130_1900_fk_v2_user"
branch_labels = None
depends_on = None


def _safe_add_column(table: str, column: sa.Column) -> None:
    """Add column only if it doesn't exist."""
    conn = op.get_bind()
    result = conn.execute(
        sa.text(
            f"SELECT COUNT(*) FROM information_schema.COLUMNS "
            f"WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='{table}' AND COLUMN_NAME='{column.name}'"
        )
    ).scalar()
    if result == 0:
        op.add_column(table, column)


def upgrade() -> None:
    # ─────────────────────────────────────────────────────────────────
    # v2_dice_config: Add probability and golden hour columns
    # ─────────────────────────────────────────────────────────────────
    _safe_add_column(
        "v2_dice_config",
        sa.Column("win_probability", sa.Float(), nullable=False, server_default="0.4"),
    )
    _safe_add_column(
        "v2_dice_config",
        sa.Column("draw_probability", sa.Float(), nullable=False, server_default="0.1"),
    )
    _safe_add_column(
        "v2_dice_config",
        sa.Column("lose_probability", sa.Float(), nullable=False, server_default="0.5"),
    )
    _safe_add_column(
        "v2_dice_config",
        sa.Column("daily_gain_cap", sa.Integer(), nullable=False, server_default="20000"),
    )
    _safe_add_column(
        "v2_dice_config",
        sa.Column("enable_golden_hour", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
    )
    _safe_add_column(
        "v2_dice_config",
        sa.Column("golden_hour_multiplier", sa.Float(), nullable=False, server_default="2.0"),
    )

    # ─────────────────────────────────────────────────────────────────
    # v2_lottery_config: Add puzzle piece probability column
    # ─────────────────────────────────────────────────────────────────
    _safe_add_column(
        "v2_lottery_config",
        sa.Column("puzzle_piece_probability", sa.Float(), nullable=False, server_default="0.0"),
    )


def downgrade() -> None:
    # v2_lottery_config
    op.drop_column("v2_lottery_config", "puzzle_piece_probability")
    
    # v2_dice_config
    op.drop_column("v2_dice_config", "golden_hour_multiplier")
    op.drop_column("v2_dice_config", "enable_golden_hour")
    op.drop_column("v2_dice_config", "daily_gain_cap")
    op.drop_column("v2_dice_config", "lose_probability")
    op.drop_column("v2_dice_config", "draw_probability")
    op.drop_column("v2_dice_config", "win_probability")
