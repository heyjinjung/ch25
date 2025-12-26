"""Add app_ui_config table for admin-editable UI copy/CTA.

Revision ID: 20251221_0024
Revises: 20251217_0023
Create Date: 2025-12-21

- Creates `app_ui_config` table with unique `key`
- Stores JSON payload to drive public UI (copy, CTA links, etc)

This migration is written defensively for MySQL by checking information_schema.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "20251221_0024"
down_revision = "20251217_0023"
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
        # SQLite in tests doesn't have information_schema.
        op.create_table(
            "app_ui_config",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("key", sa.String(length=100), nullable=False),
            sa.Column("value_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.UniqueConstraint("key", name="uq_app_ui_config_key"),
        )
        return

    if not _table_exists("app_ui_config"):
        op.create_table(
            "app_ui_config",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("key", sa.String(length=100), nullable=False),
            sa.Column("value_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.UniqueConstraint("key", name="uq_app_ui_config_key"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name if bind and bind.dialect else ""
    if dialect == "sqlite":
        op.drop_table("app_ui_config")
        return

    if _table_exists("app_ui_config"):
        op.drop_table("app_ui_config")
