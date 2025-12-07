"""Add event_name column to user_event_log

Revision ID: 20251207_0005
Revises: 20251207_0004
Create Date: 2025-12-07
"""
from alembic import op

revision = "20251207_0005"
down_revision = "20251207_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add columns required by current models/game logging. MySQL 5.7 compatibility (no IF NOT EXISTS).
    op.execute(
        """
        ALTER TABLE user_event_log
          ADD COLUMN event_name VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN' AFTER feature_type,
          ADD COLUMN meta_json JSON NULL AFTER event_name;
        """
    )
    op.execute("CREATE INDEX ix_user_event_log_event_name ON user_event_log (event_name);")


def downgrade() -> None:
  op.execute("DROP INDEX IF EXISTS ix_user_event_log_event_name ON user_event_log;")
  op.execute("ALTER TABLE user_event_log DROP COLUMN IF EXISTS meta_json;")
  op.execute("ALTER TABLE user_event_log DROP COLUMN IF EXISTS event_name;")
