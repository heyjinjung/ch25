"""add v2 puzzle tokens

Revision ID: 20260119_1711
Revises: 20260119_1700
Create Date: 2026-01-19 17:11:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260119_1711"
down_revision = "20260119_1700"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add PUZZLE_C1, PUZZLE_C2, PUZZLE_J, PUZZLE_M to user_game_wallet token_type enum
    # Note: keep legacy tokens for backward compatibility.
    bind = op.get_bind()
    col_type = bind.execute(
        sa.text(
            "SELECT COLUMN_TYPE FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_game_wallet' AND COLUMN_NAME = 'token_type'"
        )
    ).scalar()
    if col_type and "PUZZLE_C1" in col_type:
        return

    op.execute(
        "ALTER TABLE user_game_wallet "
        "MODIFY COLUMN token_type ENUM("
        "'ROULETTE_COIN','DICE_TOKEN','TRIAL_TOKEN','LOTTERY_TICKET','CC_COIN',"
        "'GOLD_KEY','DIAMOND_KEY','DIAMOND','GOLD_KEY_FRAGMENT','DIAMOND_KEY_FRAGMENT',"
        "'PUZZLE_C','PUZZLE_C1','PUZZLE_C2','PUZZLE_J','PUZZLE_M','VAULT'"
        ") NOT NULL"
    )


def downgrade() -> None:
    # Remove PUZZLE_C1, PUZZLE_C2, PUZZLE_J, PUZZLE_M (Warning: data loss possible)
    bind = op.get_bind()
    col_type = bind.execute(
        sa.text(
            "SELECT COLUMN_TYPE FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_game_wallet' AND COLUMN_NAME = 'token_type'"
        )
    ).scalar()
    if not col_type or "PUZZLE_C1" not in col_type:
        return

    op.execute(
        "ALTER TABLE user_game_wallet "
        "MODIFY COLUMN token_type ENUM("
        "'ROULETTE_COIN','DICE_TOKEN','TRIAL_TOKEN','LOTTERY_TICKET','CC_COIN',"
        "'GOLD_KEY','DIAMOND_KEY','DIAMOND','GOLD_KEY_FRAGMENT','DIAMOND_KEY_FRAGMENT',"
        "'PUZZLE_C','VAULT'"
        ") NOT NULL"
    )
