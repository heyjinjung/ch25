"""Configure fixed Team Battle season schedule.

Revision ID: 20251215_0014
Revises: 20251215_0013
Create Date: 2025-12-15

Target schedule (Asia/Seoul):
- Starts: 2025-12-15 22:00 KST
- Team selection: first 24 hours
- Ends: 2025-12-21 22:00 KST

Stored in DB as UTC naive datetimes.
"""

from alembic import op

revision = "20251215_0014"
down_revision = "20251215_0013"
branch_labels = None
depends_on = None


SEASON_NAME = "Team Battle Event 2025-12-15"

# 2025-12-15 22:00:00 KST = 2025-12-15 13:00:00 UTC
STARTS_AT_UTC = "2025-12-15 13:00:00"

# 2025-12-21 22:00:00 KST = 2025-12-21 13:00:00 UTC
ENDS_AT_UTC = "2025-12-21 13:00:00"


def upgrade() -> None:
    # Deactivate any previously active seasons to avoid ambiguity.
    op.execute("UPDATE team_season SET is_active = 0 WHERE is_active = 1")

    # Upsert the event season by unique name.
    op.execute(
        f"""
        INSERT INTO team_season (name, starts_at, ends_at, is_active, rewards_schema)
        VALUES (
          '{SEASON_NAME}',
          '{STARTS_AT_UTC}',
          '{ENDS_AT_UTC}',
          1,
          '{{"rank1_coupon": 30000, "rank2_points": 100, "top3_coupon": 10000}}'
        )
        ON DUPLICATE KEY UPDATE
          starts_at = VALUES(starts_at),
          ends_at = VALUES(ends_at),
          is_active = 1,
          rewards_schema = VALUES(rewards_schema),
          updated_at = CURRENT_TIMESTAMP;
        """
    )


def downgrade() -> None:
    # Deactivate and remove the event season.
    op.execute(f"UPDATE team_season SET is_active = 0 WHERE name = '{SEASON_NAME}'")
    op.execute(f"DELETE FROM team_season WHERE name = '{SEASON_NAME}'")
