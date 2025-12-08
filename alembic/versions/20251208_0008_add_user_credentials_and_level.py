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


def upgrade() -> None:
    op.add_column("user", sa.Column("nickname", sa.String(length=100), nullable=True))
    op.add_column("user", sa.Column("password_hash", sa.String(length=128), nullable=True))
    op.add_column("user", sa.Column("level", sa.Integer(), nullable=False, server_default="1"))


def downgrade() -> None:
    op.drop_column("user", "level")
    op.drop_column("user", "password_hash")
    op.drop_column("user", "nickname")
