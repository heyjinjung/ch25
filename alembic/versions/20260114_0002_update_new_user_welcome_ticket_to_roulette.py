"""update new user welcome ticket to roulette

Revision ID: 20260114_0002_update_new_user_welcome_ticket_to_roulette
Revises: 20260114_0001_add_new_user_welcome_missions
Create Date: 2026-01-14

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260114_0002_update_new_user_welcome_ticket_to_roulette"
down_revision = "20260114_0001_add_new_user_welcome_missions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            UPDATE mission
            SET
                reward_type = 'TICKET_ROULETTE',
                reward_amount = 5,
                description = '웰컴 선물: 룰렛 티켓 5장'
            WHERE logic_key = 'NEW_USER_WELCOME_TICKET'
            """
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            UPDATE mission
            SET
                reward_type = 'TICKET_LOTTERY',
                reward_amount = 5,
                description = '웰컴 선물: 로또 티켓 5장'
            WHERE logic_key = 'NEW_USER_WELCOME_TICKET'
            """
        )
    )
