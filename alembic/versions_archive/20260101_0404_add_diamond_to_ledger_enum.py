"""Add DIAMOND to UserGameWalletLedger enum

Revision ID: 20260101_0404
Revises: 20260101_0403
Create Date: 2026-01-01 11:55:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260101_0404'
down_revision = '20260101_0403'
branch_labels = None
depends_on = None


def upgrade():
    # Helper to modify ENUM in MySQL
    op.execute("ALTER TABLE user_game_wallet_ledger MODIFY COLUMN token_type ENUM('ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET','CC_COIN','GOLD_KEY','DIAMOND_KEY', 'DIAMOND') NOT NULL")


def downgrade():
    op.execute("DELETE FROM user_game_wallet_ledger WHERE token_type = 'DIAMOND'")
    op.execute("ALTER TABLE user_game_wallet_ledger MODIFY COLUMN token_type ENUM('ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET','CC_COIN','GOLD_KEY','DIAMOND_KEY') NOT NULL")
