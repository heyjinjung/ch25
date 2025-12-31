"""Add telegram link-token fields to user table

Revision ID: rev_tg_link_token_fields
Revises: f4d672d0b5d3
Create Date: 2025-12-31

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "rev_tg_link_token_fields"
down_revision = "f4d672d0b5d3"
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
    if not _column_exists('user', 'telegram_link_nonce'):
        op.add_column("user", sa.Column("telegram_link_nonce", sa.String(length=64), nullable=True))
    if not _column_exists('user', 'telegram_link_nonce_expires_at'):
        op.add_column("user", sa.Column("telegram_link_nonce_expires_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("user", "telegram_link_nonce_expires_at")
    op.drop_column("user", "telegram_link_nonce")

