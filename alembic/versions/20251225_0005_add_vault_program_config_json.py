"""Add VaultProgram.config_json for operational settings.

Revision ID: 20251225_0005
Revises: 20251225_0004
Create Date: 2025-12-25 15:55:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision = "20251225_0005"
down_revision = "20251225_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add config_json column to vault_program table
    # Using JSON type which maps to JSON in MySQL and generic JSON/Text in others
    op.add_column("vault_program", sa.Column("config_json", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("vault_program", "config_json")
