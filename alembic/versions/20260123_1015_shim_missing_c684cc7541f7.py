"""Shim for missing revision c684cc7541f7.

This repository previously had an Alembic revision with id 'c684cc7541f7',
which exists in some databases' alembic_version table. The original migration
file is no longer present in the repo, which breaks Alembic graph resolution.

This shim is intentionally a no-op and only restores revision history
continuity.

Revision ID: c684cc7541f7
Revises: 20260120_1200_add_mission_reward_gifticon
Create Date: 2026-01-23
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "c684cc7541f7"
down_revision = "20260120_1200_add_mission_reward_gifticon"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # no-op shim
    pass


def downgrade() -> None:
    # no-op shim
    pass
