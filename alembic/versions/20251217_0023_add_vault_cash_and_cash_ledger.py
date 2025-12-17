"""Add vault/cash balances and cash ledger.

Revision ID: 20251217_0023
Revises: 20251216_0022
Create Date: 2025-12-17

- Adds `user.vault_balance` (locked vault amount)
- Adds `user.cash_balance` (available spendable amount)
- Adds `user.vault_fill_used_at` (v1.0: free fill once)
- Creates `user_cash_ledger` table for cash balance changes

This migration is written defensively for MySQL by checking information_schema.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "20251217_0023"
down_revision = "20251216_0022"
branch_labels = None
depends_on = None


def _table_exists(table: str) -> bool:
    conn = op.get_bind()
    return bool(
        conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = DATABASE()
                  AND table_name = :table
                """
            ),
            {"table": table},
        ).scalar()
    )


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


def _add_column_if_missing(table: str, column: str, column_obj: sa.Column) -> None:
    if not _column_exists(table, column):
        op.add_column(table, column_obj)


def upgrade() -> None:
    _add_column_if_missing(
        "user",
        "vault_balance",
        sa.Column("vault_balance", sa.Integer(), nullable=False, server_default="0"),
    )
    _add_column_if_missing(
        "user",
        "cash_balance",
        sa.Column("cash_balance", sa.Integer(), nullable=False, server_default="0"),
    )
    _add_column_if_missing(
        "user",
        "vault_fill_used_at",
        sa.Column("vault_fill_used_at", sa.DateTime(), nullable=True),
    )

    if not _table_exists("user_cash_ledger"):
        op.create_table(
            "user_cash_ledger",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("delta", sa.Integer(), nullable=False),
            sa.Column("balance_after", sa.Integer(), nullable=False),
            sa.Column("reason", sa.String(length=100), nullable=True),
            sa.Column("label", sa.String(length=255), nullable=True),
            sa.Column("meta_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_user_cash_ledger_user_created_at", "user_cash_ledger", ["user_id", "created_at"], unique=False)


def downgrade() -> None:
    if _table_exists("user_cash_ledger"):
        op.drop_index("ix_user_cash_ledger_user_created_at", table_name="user_cash_ledger")
        op.drop_table("user_cash_ledger")

    for col in ("vault_fill_used_at", "cash_balance", "vault_balance"):
        if _column_exists("user", col):
            op.drop_column("user", col)
