"""add money integrity check constraints

Revision ID: 20260119_0001
Revises: 20260117_1200
Create Date: 2026-01-19 00:01:00

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = "20260119_0001"
down_revision = "20260117_1200"
branch_labels = None
depends_on = None


def _constraint_exists(table: str, name: str) -> bool:
    conn = op.get_bind()
    return bool(
        conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.table_constraints
                WHERE table_schema = DATABASE()
                  AND table_name = :table
                  AND constraint_name = :name
                """
            ),
            {"table": table, "name": name},
        ).scalar()
    )


def upgrade() -> None:
    constraints = [
        ("ck_user_vault_balance_non_negative", "user", "vault_balance >= 0"),
        ("ck_user_vault_locked_balance_non_negative", "user", "vault_locked_balance >= 0"),
        ("ck_user_vault_available_balance_non_negative", "user", "vault_available_balance >= 0"),
        ("ck_user_cash_balance_non_negative", "user", "cash_balance >= 0"),
        ("ck_user_vault_spent_total_non_negative", "user", "vault_spent_total >= 0"),
        ("ck_user_vault_spent_today_non_negative", "user", "vault_spent_today >= 0"),
        ("ck_user_total_charge_amount_non_negative", "user", "total_charge_amount >= 0"),
        ("ck_user_first_deposit_amount_non_negative", "user", "first_deposit_amount >= 0"),
        ("ck_user_next_season_seed_non_negative", "user", "next_season_seed >= 0"),
        ("ck_user_diamond_key_count_non_negative", "user", "diamond_key_count >= 0"),
        ("ck_user_game_wallet_balance_non_negative", "user_game_wallet", "balance >= 0"),
    ]

    for name, table, condition in constraints:
        if not _constraint_exists(table, name):
            op.create_check_constraint(name, table, condition)


def downgrade() -> None:
    constraints = [
        ("ck_user_game_wallet_balance_non_negative", "user_game_wallet"),
        ("ck_user_diamond_key_count_non_negative", "user"),
        ("ck_user_next_season_seed_non_negative", "user"),
        ("ck_user_first_deposit_amount_non_negative", "user"),
        ("ck_user_total_charge_amount_non_negative", "user"),
        ("ck_user_vault_spent_today_non_negative", "user"),
        ("ck_user_vault_spent_total_non_negative", "user"),
        ("ck_user_cash_balance_non_negative", "user"),
        ("ck_user_vault_available_balance_non_negative", "user"),
        ("ck_user_vault_locked_balance_non_negative", "user"),
        ("ck_user_vault_balance_non_negative", "user"),
    ]

    for name, table in constraints:
        if _constraint_exists(table, name):
            op.drop_constraint(name, table, type_="check")
