"""add mission time window and auto_claim

Revision ID: 20260104_2001_add_mission_time_window_fields
Revises: 20260104_1628_2684fc9707df
Create Date: 2026-01-04 20:01:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260104_2001_add_mission_time_window_fields"
down_revision = "20260104_1628_2684fc9707df"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("mission", sa.Column("start_time", sa.Time(), nullable=True))
    op.add_column("mission", sa.Column("end_time", sa.Time(), nullable=True))
    op.add_column("mission", sa.Column("auto_claim", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("mission", "auto_claim")
    op.drop_column("mission", "end_time")
    op.drop_column("mission", "start_time")
