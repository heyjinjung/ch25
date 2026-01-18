"""Add key roulette support

Revision ID: rev_key_roulette
Revises: cd4588841c24
Create Date: 2025-12-28 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'rev_key_roulette'
down_revision = 'cd4588841c24'
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    return bool(
        conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = :table
                  AND column_name = :column
                """
            ),
            {"table": table, "column": column},
        ).scalar()
    )


def upgrade():
    # 1. Add ticket_type to roulette_config
    if not _column_exists('roulette_config', 'ticket_type'):
        op.add_column('roulette_config', sa.Column('ticket_type', sa.String(length=50), server_default='ROULETTE_COIN', nullable=False))

    # 2. Update GameTokenType ENUM
    # MySQL requires rewriting the whole ENUM definition
    op.execute("ALTER TABLE user_game_wallet MODIFY COLUMN token_type ENUM('ROULETTE_COIN', 'DICE_TOKEN', 'LOTTERY_TICKET', 'CC_COIN', 'GOLD_KEY', 'DIAMOND_KEY') NOT NULL")
    op.execute("ALTER TABLE user_game_wallet_ledger MODIFY COLUMN token_type ENUM('ROULETTE_COIN', 'DICE_TOKEN', 'LOTTERY_TICKET', 'CC_COIN', 'GOLD_KEY', 'DIAMOND_KEY') NOT NULL")


def downgrade():
    # 1. Drop ticket_type
    op.drop_column('roulette_config', 'ticket_type')

    # 2. Revert ENUM (Warning: This will fail if there are rows with new keys)
    op.execute("ALTER TABLE user_game_wallet MODIFY COLUMN token_type ENUM('ROULETTE_COIN', 'DICE_TOKEN', 'LOTTERY_TICKET', 'CC_COIN') NOT NULL")
