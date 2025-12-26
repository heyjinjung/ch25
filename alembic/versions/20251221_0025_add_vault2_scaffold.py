"""Add Vault 2.0 scaffold tables.

Revision ID: 20251221_0025
Revises: 20251221_0024
Create Date: 2025-12-21

- Adds `vault_program` and `vault_status` for future Vault state machine rollout.
- This is scaffolding only; current gameplay continues using user.vault_balance.

This migration is written defensively for MySQL by checking information_schema.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "20251221_0025"
down_revision = "20251221_0024"
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


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name if bind and bind.dialect else ""

    if dialect == "sqlite":
        op.create_table(
            "vault_program",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("key", sa.String(length=50), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("duration_hours", sa.Integer(), nullable=False, server_default="24"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.UniqueConstraint("key", name="uq_vault_program_key"),
        )

        op.create_table(
            "vault_status",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False, index=True),
            sa.Column("program_id", sa.Integer(), sa.ForeignKey("vault_program.id"), nullable=False, index=True),
            sa.Column("state", sa.String(length=20), nullable=False, server_default="LOCKED"),
            sa.Column("locked_amount", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("locked_at", sa.DateTime(), nullable=True),
            sa.Column("expires_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.UniqueConstraint("user_id", "program_id", name="uq_vault_status_user_program"),
        )
        return

    if not _table_exists("vault_program"):
        op.create_table(
            "vault_program",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("key", sa.String(length=50), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("duration_hours", sa.Integer(), nullable=False, server_default="24"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.UniqueConstraint("key", name="uq_vault_program_key"),
        )

    if not _table_exists("vault_status"):
        op.create_table(
            "vault_status",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False, index=True),
            sa.Column("program_id", sa.Integer(), sa.ForeignKey("vault_program.id"), nullable=False, index=True),
            sa.Column("state", sa.String(length=20), nullable=False, server_default="LOCKED"),
            sa.Column("locked_amount", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("locked_at", sa.DateTime(), nullable=True),
            sa.Column("expires_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.UniqueConstraint("user_id", "program_id", name="uq_vault_status_user_program"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name if bind and bind.dialect else ""

    if dialect == "sqlite":
        op.drop_table("vault_status")
        op.drop_table("vault_program")
        return

    if _table_exists("vault_status"):
        op.drop_table("vault_status")

    if _table_exists("vault_program"):
        op.drop_table("vault_program")
