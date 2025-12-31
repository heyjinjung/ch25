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


def upgrade() -> None:
    op.add_column("user", sa.Column("telegram_link_nonce", sa.String(length=64), nullable=True))
    op.add_column("user", sa.Column("telegram_link_nonce_expires_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("user", "telegram_link_nonce_expires_at")
    op.drop_column("user", "telegram_link_nonce")

