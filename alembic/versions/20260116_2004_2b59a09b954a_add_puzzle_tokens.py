"""add_puzzle_tokens

Revision ID: 2b59a09b954a
Revises: 3dabb97ccbef
Create Date: 2026-01-16 20:04:37.109462+09:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2b59a09b954a'
down_revision = '3dabb97ccbef'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Manual update for Enum
    op.execute("ALTER TABLE user_game_wallet MODIFY COLUMN token_type ENUM('ROULETTE_COIN','DICE_TOKEN','TRIAL_TOKEN','LOTTERY_TICKET','CC_COIN','GOLD_KEY','DIAMOND_KEY','DIAMOND','GOLD_KEY_FRAGMENT','DIAMOND_KEY_FRAGMENT','PUZZLE_C','PUZZLE_J','PUZZLE_M','VAULT') NOT NULL")


def downgrade() -> None:
    # Revert to previous Enum (Warning: Data loss possible if new tokens exist)
    op.execute("ALTER TABLE user_game_wallet MODIFY COLUMN token_type ENUM('ROULETTE_COIN','DICE_TOKEN','TRIAL_TOKEN','LOTTERY_TICKET','CC_COIN','GOLD_KEY','DIAMOND_KEY','DIAMOND') NOT NULL")
