"""Add V2 gifticon reward types to mission reward enum.

Revision ID: 20260124_1500_add_mission_reward_gifticons_v2
Revises: 20260124_1200_add_v2_golden_intervention_log
Create Date: 2026-01-24 15:00:00.000000
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260124_1500_add_mission_reward_gifticons_v2"
down_revision = "20260124_1200_add_v2_golden_intervention_log"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name
    gifticons = (
        "CHICKEN_GIFTICON_5000",
        "CHICKEN_GIFTICON_10000",
        "STARBUCKS_GIFTICON_2000",
        "STARBUCKS_GIFTICON_10000",
        "PIZZA_GIFTICON_5000",
        "PIZZA_GIFTICON_10000",
        "GOOGLE_GIFTICON_5000",
        "GOOGLE_GIFTICON_10000",
    )

    if dialect == "mysql":
        op.execute(
            "ALTER TABLE mission MODIFY COLUMN reward_type "
            "ENUM('NONE','DIAMOND','GOLD_KEY','DIAMOND_KEY','CASH_UNLOCK','TICKET_BUNDLE',"
            "'TICKET_ROULETTE','TICKET_LOTTERY','TICKET_DICE','POINT',"
            "'GIFTICON_BAEMIN','GIFTICON_COMPOSE',"
            "'CHICKEN_GIFTICON_5000','CHICKEN_GIFTICON_10000',"
            "'STARBUCKS_GIFTICON_2000','STARBUCKS_GIFTICON_10000',"
            "'PIZZA_GIFTICON_5000','PIZZA_GIFTICON_10000',"
            "'GOOGLE_GIFTICON_5000','GOOGLE_GIFTICON_10000') NOT NULL"
        )
    elif dialect == "postgresql":
        for value in gifticons:
            op.execute(
                f"ALTER TYPE missionrewardtype ADD VALUE IF NOT EXISTS '{value}'"
            )


def downgrade() -> None:
    # Downgrade is a no-op for enum value removal to avoid data loss.
    pass
