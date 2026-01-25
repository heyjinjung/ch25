"""expand v2 roulette segment slots to 8

Revision ID: 20260125_1600
Revises: 20260124_1500
Create Date: 2026-01-25 16:00:00

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260125_1600"
down_revision = "20260124_1500"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_v2_roulette_segment_slot_range",
        "v2_roulette_segment",
        type_="check",
    )
    op.create_check_constraint(
        "ck_v2_roulette_segment_slot_range",
        "v2_roulette_segment",
        "slot_index >= 0 AND slot_index <= 7",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_v2_roulette_segment_slot_range",
        "v2_roulette_segment",
        type_="check",
    )
    op.create_check_constraint(
        "ck_v2_roulette_segment_slot_range",
        "v2_roulette_segment",
        "slot_index >= 0 AND slot_index <= 5",
    )
