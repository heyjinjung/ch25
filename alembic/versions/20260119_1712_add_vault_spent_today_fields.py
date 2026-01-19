"""add vault spent today fields

Revision ID: 20260119_1712
Revises: 20260119_1711
Create Date: 2026-01-19 17:12:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260119_1712"
down_revision = "20260119_1711"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add vault_spent_today fields to user (idempotent, MySQL 8+)
    op.execute(
        "ALTER TABLE user "
        "ADD COLUMN IF NOT EXISTS vault_spent_today INTEGER NOT NULL DEFAULT '0'"
    )
    op.execute(
        "ALTER TABLE user "
        "ADD COLUMN IF NOT EXISTS vault_spent_reset_date VARCHAR(10) NULL"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE user DROP COLUMN IF EXISTS vault_spent_reset_date")
    op.execute("ALTER TABLE user DROP COLUMN IF EXISTS vault_spent_today")
