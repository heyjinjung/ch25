"""Add last_login columns to user

Revision ID: 20251207_0004
Revises: 20251207_0003
Create Date: 2025-12-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "20251207_0004"
down_revision = "20251207_0003"
branch_labels = None
depends_on = None


def _add_column_if_missing(table: str, column: str, column_obj: sa.Column) -> None:
    conn = op.get_bind()
    exists = conn.execute(
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
    if not exists:
        op.add_column(table, column_obj)


def upgrade() -> None:
    _add_column_if_missing("user", "last_login_at", sa.Column("last_login_at", sa.DateTime(), nullable=True))
    _add_column_if_missing("user", "last_login_ip", sa.Column("last_login_ip", sa.String(length=45), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    for col in ("last_login_ip", "last_login_at"):
        exists = conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = :table
                  AND column_name = :column
                """
            ),
            {"table": "user", "column": col},
        ).scalar()
        if exists:
            op.drop_column("user", col)
