"""Merge heads: new-member dice tables + user activity last_play_at

Revision ID: 20251216_0022
Revises: 20251216_0003, 20251216_0021
Create Date: 2025-12-16

This is a merge revision to ensure a single Alembic head.
"""

from alembic import op

revision = "20251216_0022"
down_revision = ("20251216_0021", "20251216_0003")
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Merge revision: no schema changes.
    pass


def downgrade() -> None:
    # Merge revision: no schema changes.
    pass
