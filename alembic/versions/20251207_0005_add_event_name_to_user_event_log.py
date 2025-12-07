"""Add event_name column to user_event_log

Revision ID: 20251207_0005
Revises: 20251207_0004
Create Date: 2025-12-07
"""
from alembic import op
from sqlalchemy import text

revision = "20251207_0005"
down_revision = "20251207_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
  conn = op.get_bind()

  def safe_exec(sql: str) -> None:
    try:
      conn.execute(text(sql))
    except Exception:
      pass

  # Align table with current model: remove legacy columns, add event_name/meta_json
  safe_exec("ALTER TABLE user_event_log DROP COLUMN event_type;")
  safe_exec("ALTER TABLE user_event_log DROP COLUMN metadata;")
  safe_exec(
    """
    ALTER TABLE user_event_log
      ADD COLUMN event_name VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN' AFTER feature_type;
    """
  )
  safe_exec("ALTER TABLE user_event_log ADD COLUMN meta_json JSON NULL AFTER event_name;")
  safe_exec("CREATE INDEX ix_user_event_log_event_name ON user_event_log (event_name);")


def downgrade() -> None:
  conn = op.get_bind()

  def safe_exec(sql: str) -> None:
    try:
      conn.execute(text(sql))
    except Exception:
      pass

  safe_exec("DROP INDEX ix_user_event_log_event_name ON user_event_log;")
  safe_exec("ALTER TABLE user_event_log DROP COLUMN meta_json;")
  safe_exec("ALTER TABLE user_event_log DROP COLUMN event_name;")
