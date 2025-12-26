"""Add deposit_remainder to external_ranking_data.

Revision ID: 20251212_0010
Revises: 20251212_0009b
Create Date: 2025-12-12
"""
"""Add deposit_remainder to external_ranking_data.

Revision ID: 20251212_0010
Revises: 20251212_0009b
Create Date: 2025-12-12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "20251212_0010"
down_revision = "20251212_0009b"
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
    if not _column_exists("external_ranking_data", "deposit_remainder"):
        op.add_column(
            "external_ranking_data",
            sa.Column("deposit_remainder", sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade() -> None:
    if _column_exists("external_ranking_data", "deposit_remainder"):
        op.drop_column("external_ranking_data", "deposit_remainder")
