"""Add gifticon reward types to mission reward enum.

Revision ID: 20260120_1200_add_mission_reward_gifticon
Revises: 20260119_1712_add_vault_spent_today_fields
Create Date: 2026-01-20
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260120_1200_add_mission_reward_gifticon"
down_revision = "20260119_1712"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "mysql":
        op.execute(
            "ALTER TABLE mission MODIFY COLUMN reward_type "
            "ENUM('NONE','DIAMOND','GOLD_KEY','DIAMOND_KEY','CASH_UNLOCK','TICKET_BUNDLE',"
            "'TICKET_ROULETTE','TICKET_LOTTERY','TICKET_DICE','POINT',"
            "'GIFTICON_BAEMIN','GIFTICON_COMPOSE') NOT NULL"
        )
    elif dialect == "postgresql":
        op.execute("ALTER TYPE missionrewardtype ADD VALUE IF NOT EXISTS 'GIFTICON_BAEMIN'")
        op.execute("ALTER TYPE missionrewardtype ADD VALUE IF NOT EXISTS 'GIFTICON_COMPOSE'")


def downgrade() -> None:
    # Downgrade is a no-op for enum value removal to avoid data loss.
    pass