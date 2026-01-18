"""Add DIAMOND to GameTokenType enum

Revision ID: 20260101_0403
Revises: 20260101_0402
Create Date: 2026-01-01 11:45:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260101_0403'
down_revision = '20260101_0402'
branch_labels = None
depends_on = None


def upgrade():
    # Helper to modify ENUM in MySQL
    # We must redefine the entire enum list
    op.execute("ALTER TABLE user_game_wallet MODIFY COLUMN token_type ENUM('ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET','CC_COIN','GOLD_KEY','DIAMOND_KEY', 'DIAMOND') NOT NULL")


def downgrade():
    # Remove DIAMOND (Warning: Data loss if rows exist)
    op.execute("DELETE FROM user_game_wallet WHERE token_type = 'DIAMOND'")
    op.execute("ALTER TABLE user_game_wallet MODIFY COLUMN token_type ENUM('ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET','CC_COIN','GOLD_KEY','DIAMOND_KEY') NOT NULL")
