"""add mission time window and auto_claim

Revision ID: c1a5f0b2d8e4
Revises: 2684fc9707df
Create Date: 2026-01-04 20:01:00.000000
"""

from alembic import op
from sqlalchemy import inspect
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "c1a5f0b2d8e4"
down_revision = "2684fc9707df"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    if not _has_column("mission", "start_time"):
        op.add_column("mission", sa.Column("start_time", sa.Time(), nullable=True))
    if not _has_column("mission", "end_time"):
        op.add_column("mission", sa.Column("end_time", sa.Time(), nullable=True))
    if not _has_column("mission", "auto_claim"):
        op.add_column(
            "mission",
            sa.Column("auto_claim", sa.Boolean(), nullable=False, server_default=sa.false()),
        )


def downgrade() -> None:
    if _has_column("mission", "auto_claim"):
        op.drop_column("mission", "auto_claim")
    if _has_column("mission", "end_time"):
        op.drop_column("mission", "end_time")
    if _has_column("mission", "start_time"):
        op.drop_column("mission", "start_time")
