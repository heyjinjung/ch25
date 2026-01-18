"""Add nickname, password_hash, level to user for admin CRUD.

Revision ID: 20251208_0008
Revises: 20251208_0007
Create Date: 2025-12-08
"""
from alembic import op
import sqlalchemy as sa

revision = "20251208_0008"
down_revision = "20251208_0007"
branch_labels = None
depends_on = None


def _column_missing(table: str, column: str) -> bool:
    """Return True if the column does NOT exist in the current database."""
    conn = op.get_bind()
    exists = conn.execute(
        sa.text(
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
    return not bool(exists)


def _drop_column_if_exists(table: str, column: str) -> None:
    """Drop the column if it exists."""
    conn = op.get_bind()
    exists = conn.execute(
        sa.text(
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
    if exists:
        op.drop_column(table, column)


def upgrade() -> None:
    if _column_missing("user", "nickname"):
        op.add_column("user", sa.Column("nickname", sa.String(length=100), nullable=True))
    if _column_missing("user", "password_hash"):
        op.add_column("user", sa.Column("password_hash", sa.String(length=128), nullable=True))
    if _column_missing("user", "level"):
        op.add_column("user", sa.Column("level", sa.Integer(), nullable=False, server_default="1"))


def downgrade() -> None:
    _drop_column_if_exists("user", "level")
    _drop_column_if_exists("user", "password_hash")
    _drop_column_if_exists("user", "nickname")
