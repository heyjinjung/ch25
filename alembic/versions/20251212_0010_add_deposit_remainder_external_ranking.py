"""Add deposit_remainder to external_ranking_data.

Revision ID: 20251212_0010
Revises: 20251212_0009
Create Date: 2025-12-12
"""
from alembic import op
import sqlalchemy as sa

revision = "20251212_0010"
down_revision = "20251212_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "external_ranking_data",
        sa.Column("deposit_remainder", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("external_ranking_data", "deposit_remainder")
