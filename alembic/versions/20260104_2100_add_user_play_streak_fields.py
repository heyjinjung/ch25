"""add user play streak fields

Revision ID: d2b7c9e1f0a3
Revises: c1a5f0b2d8e4
Create Date: 2026-01-04 21:00:00.000000
"""

from alembic import op
from sqlalchemy import inspect
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d2b7c9e1f0a3"
down_revision = "c1a5f0b2d8e4"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _has_index(table_name: str, index_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return any(ix.get("name") == index_name for ix in inspector.get_indexes(table_name))


def upgrade() -> None:
    if not _has_column("user", "play_streak"):
        op.add_column(
            "user",
            sa.Column("play_streak", sa.Integer(), nullable=False, server_default="0"),
        )
    if not _has_column("user", "last_play_date"):
        op.add_column(
            "user",
            sa.Column("last_play_date", sa.Date(), nullable=True),
        )
    if not _has_index("user", "idx_user_streak"):
        op.create_index(
            "idx_user_streak",
            "user",
            ["play_streak", "last_play_date"],
            unique=False,
        )


def downgrade() -> None:
    if _has_index("user", "idx_user_streak"):
        op.drop_index("idx_user_streak", table_name="user")
    if _has_column("user", "last_play_date"):
        op.drop_column("user", "last_play_date")
    if _has_column("user", "play_streak"):
        op.drop_column("user", "play_streak")
