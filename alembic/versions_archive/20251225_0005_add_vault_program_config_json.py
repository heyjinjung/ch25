"""Add VaultProgram.config_json for operational settings.

Revision ID: 20251225_0005
Revises: 20251225_0004
Create Date: 2025-12-25 15:55:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql
from sqlalchemy import text

revision = "20251225_0005"
down_revision = "20251225_0004"
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
    # Add config_json column to vault_program table
    # Using JSON type which maps to JSON in MySQL and generic JSON/Text in others
    if not _column_exists("vault_program", "config_json"):
        op.add_column("vault_program", sa.Column("config_json", sa.JSON(), nullable=True))


def downgrade() -> None:
    if _column_exists("vault_program", "config_json"):
        op.drop_column("vault_program", "config_json")

