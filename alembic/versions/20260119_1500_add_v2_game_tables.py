"""add v2 game tables

Revision ID: 20260119_1500
Revises: 20260119_1400
Create Date: 2026-01-19 15:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260119_1500"
down_revision = "20260119_1400"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "v2_roulette_config",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("ticket_type", sa.String(length=50), nullable=False, server_default="ROULETTE_TICKET"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("max_daily_spins", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("grade", sa.String(length=20), nullable=False, server_default="COMMON"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    op.create_table(
        "v2_roulette_segment",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("config_id", sa.Integer(), sa.ForeignKey("v2_roulette_config.id", ondelete="CASCADE"), nullable=False),
        sa.Column("slot_index", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=50), nullable=False),
        sa.Column("reward_type", sa.String(length=50), nullable=False),
        sa.Column("reward_amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("weight", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_jackpot", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("config_id", "slot_index", name="uq_v2_roulette_segment_slot"),
        sa.CheckConstraint("slot_index >= 0 AND slot_index <= 5", name="ck_v2_roulette_segment_slot_range"),
        sa.CheckConstraint("weight >= 0", name="ck_v2_roulette_segment_weight_non_negative"),
    )

    op.create_table(
        "v2_roulette_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("config_id", sa.Integer(), sa.ForeignKey("v2_roulette_config.id", ondelete="CASCADE"), nullable=False),
        sa.Column("segment_id", sa.Integer(), sa.ForeignKey("v2_roulette_segment.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reward_type", sa.String(length=50), nullable=False),
        sa.Column("reward_amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_v2_roulette_log_user_created_at", "v2_roulette_log", ["user_id", "created_at"])

    op.create_table(
        "v2_dice_config",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("ticket_type", sa.String(length=50), nullable=False, server_default="DICE_TICKET"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("max_daily_plays", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("win_reward_type", sa.String(length=50), nullable=False, server_default="NONE"),
        sa.Column("win_reward_amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("draw_reward_type", sa.String(length=50), nullable=False, server_default="NONE"),
        sa.Column("draw_reward_amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("lose_reward_type", sa.String(length=50), nullable=False, server_default="NONE"),
        sa.Column("lose_reward_amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    op.create_table(
        "v2_dice_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("config_id", sa.Integer(), sa.ForeignKey("v2_dice_config.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_dice_1", sa.Integer(), nullable=False),
        sa.Column("user_dice_2", sa.Integer(), nullable=False),
        sa.Column("user_sum", sa.Integer(), nullable=False),
        sa.Column("dealer_dice_1", sa.Integer(), nullable=False),
        sa.Column("dealer_dice_2", sa.Integer(), nullable=False),
        sa.Column("dealer_sum", sa.Integer(), nullable=False),
        sa.Column("result", sa.String(length=10), nullable=False),
        sa.Column("reward_type", sa.String(length=50), nullable=False, server_default="NONE"),
        sa.Column("reward_amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_v2_dice_log_user_created_at", "v2_dice_log", ["user_id", "created_at"])

    op.create_table(
        "v2_lottery_config",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("ticket_type", sa.String(length=50), nullable=False, server_default="LOTTERY_TICKET"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("max_daily_tickets", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    op.create_table(
        "v2_lottery_prize",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("config_id", sa.Integer(), sa.ForeignKey("v2_lottery_config.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(length=100), nullable=False),
        sa.Column("reward_type", sa.String(length=50), nullable=False),
        sa.Column("reward_amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("weight", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("stock", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("config_id", "label", name="uq_v2_lottery_prize_label"),
        sa.CheckConstraint("weight >= 0", name="ck_v2_lottery_prize_weight_non_negative"),
        sa.CheckConstraint("stock IS NULL OR stock >= 0", name="ck_v2_lottery_prize_stock_non_negative"),
    )

    op.create_table(
        "v2_lottery_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("config_id", sa.Integer(), sa.ForeignKey("v2_lottery_config.id", ondelete="CASCADE"), nullable=False),
        sa.Column("prize_id", sa.Integer(), sa.ForeignKey("v2_lottery_prize.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reward_type", sa.String(length=50), nullable=False),
        sa.Column("reward_amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_v2_lottery_log_user_created_at", "v2_lottery_log", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_v2_lottery_log_user_created_at", table_name="v2_lottery_log")
    op.drop_table("v2_lottery_log")

    op.drop_table("v2_lottery_prize")
    op.drop_table("v2_lottery_config")

    op.drop_index("ix_v2_dice_log_user_created_at", table_name="v2_dice_log")
    op.drop_table("v2_dice_log")

    op.drop_table("v2_dice_config")

    op.drop_index("ix_v2_roulette_log_user_created_at", table_name="v2_roulette_log")
    op.drop_table("v2_roulette_log")
    op.drop_table("v2_roulette_segment")
    op.drop_table("v2_roulette_config")
