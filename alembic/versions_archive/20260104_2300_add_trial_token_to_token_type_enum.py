"""Add TRIAL_TOKEN to GameTokenType enum columns (MySQL)

Revision ID: f5a1c0d2e9b4
Revises: e3c8d0a4b1f6
Create Date: 2026-01-04 23:00:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "f5a1c0d2e9b4"
down_revision = "e3c8d0a4b1f6"
branch_labels = None
depends_on = None


def _is_mysql() -> bool:
    bind = op.get_bind()
    return bool(bind and bind.dialect and bind.dialect.name == "mysql")


def upgrade() -> None:
    # SQLite/Postgres don't need manual ENUM ALTERs in our setup.
    if not _is_mysql():
        return

    # Keep a superset of historical values to avoid breaking existing rows.
    enum_values = (
        "'ROULETTE_COIN','DICE_TOKEN','TRIAL_TOKEN','LOTTERY_TICKET','CC_COIN','GOLD_KEY','DIAMOND_KEY','DIAMOND'"
    )

    op.execute(f"ALTER TABLE user_game_wallet MODIFY COLUMN token_type ENUM({enum_values}) NOT NULL")
    op.execute(f"ALTER TABLE user_game_wallet_ledger MODIFY COLUMN token_type ENUM({enum_values}) NOT NULL")
    op.execute(f"ALTER TABLE trial_token_bucket MODIFY COLUMN token_type ENUM({enum_values}) NOT NULL")


def downgrade() -> None:
    if not _is_mysql():
        return

    # If any TRIAL_TOKEN rows exist, remove them before shrinking the ENUM.
    op.execute("DELETE FROM trial_token_bucket WHERE token_type = 'TRIAL_TOKEN'")
    op.execute("DELETE FROM user_game_wallet_ledger WHERE token_type = 'TRIAL_TOKEN'")
    op.execute("DELETE FROM user_game_wallet WHERE token_type = 'TRIAL_TOKEN'")

    enum_values = "'ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET','CC_COIN','GOLD_KEY','DIAMOND_KEY','DIAMOND'"

    op.execute(f"ALTER TABLE user_game_wallet MODIFY COLUMN token_type ENUM({enum_values}) NOT NULL")
    op.execute(f"ALTER TABLE user_game_wallet_ledger MODIFY COLUMN token_type ENUM({enum_values}) NOT NULL")
    op.execute(f"ALTER TABLE trial_token_bucket MODIFY COLUMN token_type ENUM({enum_values}) NOT NULL")
