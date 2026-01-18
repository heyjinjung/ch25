"""disable legacy new user missions

Revision ID: 20260114_0003_disable_legacy_new_user_missions
Revises: 20260114_0002_update_new_user_welcome_ticket_to_roulette
Create Date: 2026-01-14

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260114_0003_disable_legacy_new_user_missions"
down_revision = "20260114_0002_update_new_user_welcome_ticket_to_roulette"
branch_labels = None
depends_on = None


LEGACY_LOGIC_KEYS = (
    "NEW_USER_PLAY_1",
    "NEW_USER_PLAY_3",
    "NEW_USER_VIRAL",
    "NEW_USER_LOGIN_DAY2",
)


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            UPDATE mission
            SET is_active = 0
            WHERE category = 'NEW_USER'
              AND logic_key IN :keys
            """
        ),
        {"keys": LEGACY_LOGIC_KEYS},
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            UPDATE mission
            SET is_active = 1
            WHERE category = 'NEW_USER'
              AND logic_key IN :keys
            """
        ),
        {"keys": LEGACY_LOGIC_KEYS},
    )
