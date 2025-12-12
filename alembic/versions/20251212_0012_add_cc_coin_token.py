"""Add CC_COIN token type to game wallet enums.

Revision ID: 20251212_0012
Revises: 20251212_0011
Create Date: 2025-12-12
"""
from alembic import op
import sqlalchemy as sa


revision = "20251212_0012"
down_revision = "20251212_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # MySQL ENUM alteration for user_game_wallet.token_type
    op.execute(
        """
        ALTER TABLE user_game_wallet
        MODIFY token_type ENUM('ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET','CC_COIN') NOT NULL;
        """
    )
    op.execute(
        """
        ALTER TABLE user_game_wallet_ledger
        MODIFY token_type ENUM('ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET','CC_COIN') NOT NULL;
        """
    )


def downgrade() -> None:
    # Revert ENUM to previous set
    op.execute(
        """
        ALTER TABLE user_game_wallet
        MODIFY token_type ENUM('ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET') NOT NULL;
        """
    )
    op.execute(
        """
        ALTER TABLE user_game_wallet_ledger
        MODIFY token_type ENUM('ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET') NOT NULL;
        """
    )
