"""Add missing gifticon reward types to mission reward enum.

Revision ID: 20260127_1600_add_missing_mission_gifticons
Revises: 20260125_1600_expand_v2_roulette_segment_slots
Create Date: 2026-01-27 16:00:00.000000
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260127_1600_add_missing_mission_gifticons"
down_revision = "20260125_1600_expand_v2_roulette_segment_slots"
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
            "'GIFTICON_BAEMIN','GIFTICON_COMPOSE',"
            "'CHICKEN_GIFTICON_5000','CHICKEN_GIFTICON_10000',"
            "'STARBUCKS_GIFTICON_2000','STARBUCKS_GIFTICON_10000',"
            "'PIZZA_GIFTICON_5000','PIZZA_GIFTICON_10000',"
            "'GOOGLE_GIFTICON_5000','GOOGLE_GIFTICON_10000',"
            "'CC_POINT','GAME_XP','TICKET','BUNDLE') NOT NULL"
        )
    elif dialect == "postgresql":
        gifticons = [
            "CHICKEN_GIFTICON_5000", "CHICKEN_GIFTICON_10000",
            "STARBUCKS_GIFTICON_2000", "STARBUCKS_GIFTICON_10000",
            "PIZZA_GIFTICON_5000", "PIZZA_GIFTICON_10000",
            "GOOGLE_GIFTICON_5000", "GOOGLE_GIFTICON_10000"
        ]
        for value in gifticons:
            op.execute(
                f"ALTER TYPE missionrewardtype ADD VALUE IF NOT EXISTS '{value}'"
            )


def downgrade() -> None:
    pass
