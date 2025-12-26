"""Extend Vault 2.0 scaffold tables for Phase 2/3-stage rollout (scaffold only).

Revision ID: 20251222_0001
Revises: 20251221_0026
Create Date: 2025-12-22

- Adds configuration/policy fields to `vault_program` (no behavior change).
- Adds additional balance/progress fields to `vault_status` (no behavior change).

This migration is written defensively for MySQL by checking information_schema.
SQLite is used in tests.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "20251222_0001"
down_revision = "20251221_0026"
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


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name if bind and bind.dialect else ""

    # `vault_program`
    if dialect == "sqlite":
        with op.batch_alter_table("vault_program") as batch:
            batch.add_column(sa.Column("expire_policy", sa.String(length=30), nullable=False, server_default="FIXED_24H"))
            batch.add_column(sa.Column("unlock_rules_json", sa.JSON(), nullable=True))
            batch.add_column(sa.Column("ui_copy_json", sa.JSON(), nullable=True))
            batch.add_column(sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")))

        with op.batch_alter_table("vault_status") as batch:
            batch.add_column(sa.Column("available_amount", sa.Integer(), nullable=False, server_default="0"))
            batch.add_column(sa.Column("progress_json", sa.JSON(), nullable=True))
        return

    # MySQL (defensive)
    if not _column_exists("vault_program", "expire_policy"):
        op.add_column("vault_program", sa.Column("expire_policy", sa.String(length=30), nullable=False, server_default="FIXED_24H"))
    if not _column_exists("vault_program", "unlock_rules_json"):
        op.add_column("vault_program", sa.Column("unlock_rules_json", sa.JSON(), nullable=True))
    if not _column_exists("vault_program", "ui_copy_json"):
        op.add_column("vault_program", sa.Column("ui_copy_json", sa.JSON(), nullable=True))
    if not _column_exists("vault_program", "is_active"):
        op.add_column("vault_program", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")))

    if not _column_exists("vault_status", "available_amount"):
        op.add_column("vault_status", sa.Column("available_amount", sa.Integer(), nullable=False, server_default="0"))
    if not _column_exists("vault_status", "progress_json"):
        op.add_column("vault_status", sa.Column("progress_json", sa.JSON(), nullable=True))


def downgrade() -> None:
    # Keep downgrade as no-op for safety.
    # Dropping columns in MySQL can be risky for existing data.
    return
