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


def upgrade() -> None:
    op.add_column("user", sa.Column("diamond_key_count", sa.Integer(), server_default="0", nullable=False))


def downgrade() -> None:
    op.drop_column("user", "diamond_key_count")
