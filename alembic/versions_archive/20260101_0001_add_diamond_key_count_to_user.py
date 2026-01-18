"""Add diamond_key_count to user table

Revision ID: add_diamond_key_count
Revises: rev_tg_link_token_fields
Create Date: 2026-01-01

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "add_diamond_key_count"
down_revision = "rev_tg_link_token_fields"
branch_labels = None
depends_on = None


from sqlalchemy import text

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
    if not _column_exists('user', 'diamond_key_count'):
        op.add_column("user", sa.Column("diamond_key_count", sa.Integer(), server_default="0", nullable=False))


def downgrade() -> None:
    op.drop_column("user", "diamond_key_count")
