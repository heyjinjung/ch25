"""disable legacy new user missions (fix IN binding)

Revision ID: 20260114_0004_disable_legacy_new_user_missions_fix
Revises: 20260114_0003_disable_legacy_new_user_missions
Create Date: 2026-01-14

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260114_0004_disable_legacy_new_user_missions_fix"
down_revision = "20260114_0003_disable_legacy_new_user_missions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            UPDATE mission
            SET is_active = 0
            WHERE category = 'NEW_USER'
              AND logic_key IN (:k1, :k2, :k3, :k4)
            """
        ),
        {
            "k1": "NEW_USER_PLAY_1",
            "k2": "NEW_USER_PLAY_3",
            "k3": "NEW_USER_VIRAL",
            "k4": "NEW_USER_LOGIN_DAY2",
        },
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            UPDATE mission
            SET is_active = 1
            WHERE category = 'NEW_USER'
              AND logic_key IN (:k1, :k2, :k3, :k4)
            """
        ),
        {
            "k1": "NEW_USER_PLAY_1",
            "k2": "NEW_USER_PLAY_3",
            "k3": "NEW_USER_VIRAL",
            "k4": "NEW_USER_LOGIN_DAY2",
        },
    )
