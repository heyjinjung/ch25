"""Add vault_status table.

Revision ID: 20251219_0024
Revises: 20251217_0023
Create Date: 2025-12-19

- Adds `vault_status` table for v2.0 retention strategy.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "20251219_0024"
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
    if not _table_exists("vault_status"):
        op.create_table(
            "vault_status",
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), primary_key=True),
            sa.Column("gold_status", sa.Enum("LOCKED", "UNLOCKED", "CLAIMED", "EXPIRED", name="vaultstatusenum"), nullable=False, server_default="LOCKED"),
            sa.Column("platinum_status", sa.Enum("LOCKED", "UNLOCKED", "CLAIMED", "EXPIRED", name="vaultstatusenum"), nullable=False, server_default="LOCKED"),
            sa.Column("diamond_status", sa.Enum("LOCKED", "UNLOCKED", "CLAIMED", "EXPIRED", name="vaultstatusenum"), nullable=False, server_default="LOCKED"),
            sa.Column("platinum_attendance_days", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("platinum_deposit_done", sa.Boolean(), nullable=False, server_default="0"),
            sa.Column("diamond_deposit_current", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
        )


def downgrade() -> None:
    if _table_exists("vault_status"):
        op.drop_table("vault_status")
