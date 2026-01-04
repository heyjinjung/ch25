"""add user play streak fields

Revision ID: 20260104_2100_add_user_play_streak_fields
Revises: 20260104_2001_add_mission_time_window_fields
Create Date: 2026-01-04 21:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260104_2100_add_user_play_streak_fields"
down_revision = "20260104_2001_add_mission_time_window_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column("play_streak", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "user",
        sa.Column("last_play_date", sa.Date(), nullable=True),
    )
    op.create_index("idx_user_streak", "user", ["play_streak", "last_play_date"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_user_streak", table_name="user")
    op.drop_column("user", "last_play_date")
    op.drop_column("user", "play_streak")
