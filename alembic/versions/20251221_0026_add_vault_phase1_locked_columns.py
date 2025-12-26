"""Add Vault Phase 1 user columns (locked/available/expires).

Revision ID: 20251221_0026
Revises: 20251221_0025
Create Date: 2025-12-21

Phase 1 rules:
- `vault_locked_balance` is the only source of truth for vault calculations.
- `vault_balance` becomes a legacy read-only mirror (UI compatibility).
- `vault_available_balance` does not expire (Phase 1 may keep paying unlock into cash_balance).

This migration is written defensively for MySQL by checking information_schema.
SQLite is used in tests.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "20251221_0026"
down_revision = "20251221_0025"
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


def _add_column_if_missing(table: str, column: str, column_obj: sa.Column) -> None:
    if not _column_exists(table, column):
        op.add_column(table, column_obj)


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name if bind and bind.dialect else ""

    if dialect == "sqlite":
        op.add_column(
            "user",
            sa.Column("vault_locked_balance", sa.Integer(), nullable=False, server_default="0"),
        )
        op.add_column(
            "user",
            sa.Column("vault_available_balance", sa.Integer(), nullable=False, server_default="0"),
        )
        op.add_column(
            "user",
            sa.Column("vault_locked_expires_at", sa.DateTime(), nullable=True),
        )

        # Backfill locked from legacy vault_balance.
        conn = op.get_bind()
        conn.execute(text("UPDATE user SET vault_locked_balance = COALESCE(vault_balance, 0)"))
        conn.execute(text("UPDATE user SET vault_balance = COALESCE(vault_locked_balance, 0)"))
        return

    _add_column_if_missing(
        "user",
        "vault_locked_balance",
        sa.Column("vault_locked_balance", sa.Integer(), nullable=False, server_default="0"),
    )
    _add_column_if_missing(
        "user",
        "vault_available_balance",
        sa.Column("vault_available_balance", sa.Integer(), nullable=False, server_default="0"),
    )
    _add_column_if_missing(
        "user",
        "vault_locked_expires_at",
        sa.Column("vault_locked_expires_at", sa.DateTime(), nullable=True),
    )

    # Backfill locked from legacy vault_balance.
    conn = op.get_bind()
    conn.execute(text("UPDATE user SET vault_locked_balance = IFNULL(vault_balance, 0)"))
    # Keep legacy mirror synced for existing rows.
    conn.execute(text("UPDATE user SET vault_balance = IFNULL(vault_locked_balance, 0)"))


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name if bind and bind.dialect else ""

    if dialect == "sqlite":
        for col in ("vault_locked_expires_at", "vault_available_balance", "vault_locked_balance"):
            op.drop_column("user", col)
        return

    # MySQL defensive drop
    conn = op.get_bind()

    def drop_if_exists(col: str) -> None:
        if conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = 'user'
                  AND column_name = :column
                """
            ),
            {"column": col},
        ).scalar():
            op.drop_column("user", col)

    drop_if_exists("vault_locked_expires_at")
    drop_if_exists("vault_available_balance")
    drop_if_exists("vault_locked_balance")
