"""add user streak vault bonus window fields

Revision ID: e3c8d0a4b1f6
Revises: d2b7c9e1f0a3
Create Date: 2026-01-04 22:00:00.000000
"""

from alembic import op
from sqlalchemy import inspect
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e3c8d0a4b1f6"
down_revision = "d2b7c9e1f0a3"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    if not _has_column("user", "streak_vault_bonus_date"):
        op.add_column(
            "user",
            sa.Column("streak_vault_bonus_date", sa.Date(), nullable=True),
        )
    if not _has_column("user", "streak_vault_bonus_started_at"):
        op.add_column(
            "user",
            sa.Column("streak_vault_bonus_started_at", sa.DateTime(), nullable=True),
        )


def downgrade() -> None:
    if _has_column("user", "streak_vault_bonus_started_at"):
        op.drop_column("user", "streak_vault_bonus_started_at")
    if _has_column("user", "streak_vault_bonus_date"):
        op.drop_column("user", "streak_vault_bonus_date")
