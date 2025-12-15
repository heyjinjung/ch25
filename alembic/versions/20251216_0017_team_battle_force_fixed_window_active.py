"""Force pin active team battle season window (KST) regardless of existing name.

Revision ID: 20251216_0017
Revises: 20251216_0016
Create Date: 2025-12-16

Target window (KST): 2025-12-16 00:00:00 ~ 2025-12-21 00:00:00
Stored in DB (UTC naive): 2025-12-15 15:00:00 ~ 2025-12-20 15:00:00

Rationale:
Some environments already have an active season with a different name (e.g. '2차 팀배틀').
The previous migration (0016) upserts by name, so it may not update that existing season.
This migration updates the currently-active season (any name) to the fixed window and
ensures only one active season remains.
"""

from alembic import op
import sqlalchemy as sa

revision = "20251216_0017"
down_revision = "20251216_0016"
branch_labels = None
depends_on = None


STARTS_AT_UTC = "2025-12-15 15:00:00"
ENDS_AT_UTC = "2025-12-20 15:00:00"
FALLBACK_NAME = "2차 팀배틀"


def upgrade() -> None:
    conn = op.get_bind()

    # Prefer currently-active season, otherwise fall back to an existing named season.
    active_id = conn.execute(sa.text("SELECT id FROM team_season WHERE is_active = 1 ORDER BY id DESC LIMIT 1")).scalar()
    if not active_id:
        active_id = conn.execute(sa.text("SELECT id FROM team_season WHERE name = :name ORDER BY id DESC LIMIT 1"), {"name": FALLBACK_NAME}).scalar()

    if active_id:
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
            {"id": active_id, "starts_at": STARTS_AT_UTC, "ends_at": ENDS_AT_UTC},
        )
        conn.execute(sa.text("UPDATE team_season SET is_active = 0 WHERE id != :id"), {"id": active_id})
        return

    # If no seasons exist at all, create a new one and mark as active.
    conn.execute(
        sa.text(
            """
            INSERT INTO team_season (name, starts_at, ends_at, is_active, rewards_schema, created_at, updated_at)
            VALUES (:name, :starts_at, :ends_at, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """
        ),
        {"name": FALLBACK_NAME, "starts_at": STARTS_AT_UTC, "ends_at": ENDS_AT_UTC},
    )
    new_id = conn.execute(sa.text("SELECT id FROM team_season WHERE name = :name ORDER BY id DESC LIMIT 1"), {"name": FALLBACK_NAME}).scalar()
    if new_id:
        conn.execute(sa.text("UPDATE team_season SET is_active = 0 WHERE id != :id"), {"id": new_id})


def downgrade() -> None:
    # Best-effort: do not attempt to restore previous dates.
    pass
