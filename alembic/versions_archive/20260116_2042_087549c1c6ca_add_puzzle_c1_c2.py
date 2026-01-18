"""add_puzzle_c1_c2

Revision ID: 087549c1c6ca
Revises: 2b59a09b954a
Create Date: 2026-01-16 20:42:16.215900+09:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '087549c1c6ca'
down_revision = '2b59a09b954a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add PUZZLE_C1, PUZZLE_C2
    op.execute("ALTER TABLE user_game_wallet MODIFY COLUMN token_type ENUM('ROULETTE_COIN','DICE_TOKEN','TRIAL_TOKEN','LOTTERY_TICKET','CC_COIN','GOLD_KEY','DIAMOND_KEY','DIAMOND','GOLD_KEY_FRAGMENT','DIAMOND_KEY_FRAGMENT','PUZZLE_C','PUZZLE_J','PUZZLE_M','VAULT','PUZZLE_C1','PUZZLE_C2') NOT NULL")


def downgrade() -> None:
    # Revert to previous state (Warning: Data loss possible for C1/C2)
    op.execute("ALTER TABLE user_game_wallet MODIFY COLUMN token_type ENUM('ROULETTE_COIN','DICE_TOKEN','TRIAL_TOKEN','LOTTERY_TICKET','CC_COIN','GOLD_KEY','DIAMOND_KEY','DIAMOND','GOLD_KEY_FRAGMENT','DIAMOND_KEY_FRAGMENT','PUZZLE_C','PUZZLE_J','PUZZLE_M','VAULT') NOT NULL")
