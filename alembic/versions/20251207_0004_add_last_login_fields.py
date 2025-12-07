"""Add last_login columns to user

Revision ID: 20251207_0004
Revises: 20251207_0002
Create Date: 2025-12-07
"""
from alembic import op
import sqlalchemy as sa

revision = "20251207_0004"
down_revision = "20251207_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user", sa.Column("last_login_at", sa.DateTime(), nullable=True))
    op.add_column("user", sa.Column("last_login_ip", sa.String(length=45), nullable=True))


def downgrade() -> None:
    op.drop_column("user", "last_login_ip")
    op.drop_column("user", "last_login_at")
