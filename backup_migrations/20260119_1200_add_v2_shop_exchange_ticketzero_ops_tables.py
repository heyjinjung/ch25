"""add v2 shop/exchange/ticket-zero/ops tables

Revision ID: 20260119_1200
Revises: 20260119_1100
Create Date: 2026-01-19 12:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260119_1200"
down_revision = "20260119_1100"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "v2_shop_order",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("sku", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("cost_type", sa.String(length=50), nullable=False),
        sa.Column("cost_amount", sa.Integer(), nullable=False),
        sa.Column("reward_type", sa.String(length=50), nullable=False),
        sa.Column("reward_amount", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_v2_shop_order_user_id", "v2_shop_order", ["user_id"])
    op.create_index("ix_v2_shop_order_sku", "v2_shop_order", ["sku"])

    op.create_table(
        "v2_exchange_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("input_type", sa.String(length=50), nullable=False),
        sa.Column("input_amount", sa.Integer(), nullable=False),
        sa.Column("output_type", sa.String(length=50), nullable=False),
        sa.Column("output_amount", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_v2_exchange_log_user_id", "v2_exchange_log", ["user_id"])

    op.create_table(
        "v2_ticket_zero_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("ticket_type", sa.String(length=50), nullable=False),
        sa.Column("ticket_amount", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("reason", sa.String(length=80), nullable=False, server_default="BAILOUT_GRANT"),
        sa.Column("granted_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_v2_ticket_zero_log_user_id", "v2_ticket_zero_log", ["user_id"])

    op.create_table(
        "v2_ops_execution_result",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=50), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_v2_ops_execution_result_task_id", "v2_ops_execution_result", ["task_id"])


def downgrade() -> None:
    op.drop_index("ix_v2_ops_execution_result_task_id", table_name="v2_ops_execution_result")
    op.drop_table("v2_ops_execution_result")

    op.drop_index("ix_v2_ticket_zero_log_user_id", table_name="v2_ticket_zero_log")
    op.drop_table("v2_ticket_zero_log")

    op.drop_index("ix_v2_exchange_log_user_id", table_name="v2_exchange_log")
    op.drop_table("v2_exchange_log")

    op.drop_index("ix_v2_shop_order_sku", table_name="v2_shop_order")
    op.drop_index("ix_v2_shop_order_user_id", table_name="v2_shop_order")
    op.drop_table("v2_shop_order")
