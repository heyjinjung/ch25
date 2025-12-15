"""Fix team battle season window (KST) and pin as active.

Revision ID: 20251216_0016
Revises: 20251215_0015
Create Date: 2025-12-16

This pins the event window to:
- KST 2025-12-16 00:00:00  ~  2025-12-21 00:00:00
Stored as UTC-naive in DB:
- UTC 2025-12-15 15:00:00  ~  2025-12-20 15:00:00
"""

from alembic import op
import sqlalchemy as sa

revision = "20251216_0016"
down_revision = "20251215_0015"
branch_labels = None
depends_on = None


SEASON_NAME = "Team Battle 2025-12-16"
STARTS_AT_UTC = "2025-12-15 15:00:00"
ENDS_AT_UTC = "2025-12-20 15:00:00"


def upgrade() -> None:
    conn = op.get_bind()

    # Upsert by unique season name.
    existing_id = conn.execute(sa.text("SELECT id FROM team_season WHERE name = :name"), {"name": SEASON_NAME}).scalar()

    if existing_id:
        conn.execute(
            sa.text(
                """
                UPDATE team_season
                SET starts_at = :starts_at,
                    ends_at = :ends_at,
                    is_active = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
                """
            ),
            {"id": existing_id, "starts_at": STARTS_AT_UTC, "ends_at": ENDS_AT_UTC},
        )
    else:
        conn.execute(
            sa.text(
                """
                INSERT INTO team_season (name, starts_at, ends_at, is_active, rewards_schema, created_at, updated_at)
                VALUES (:name, :starts_at, :ends_at, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            ),
            {"name": SEASON_NAME, "starts_at": STARTS_AT_UTC, "ends_at": ENDS_AT_UTC},
        )

    # Ensure only this season is active.
    conn.execute(sa.text("UPDATE team_season SET is_active = 0 WHERE name != :name"), {"name": SEASON_NAME})


def downgrade() -> None:
    conn = op.get_bind()
    # Best-effort: deactivate this pinned season.
    conn.execute(sa.text("UPDATE team_season SET is_active = 0 WHERE name = :name"), {"name": SEASON_NAME})
