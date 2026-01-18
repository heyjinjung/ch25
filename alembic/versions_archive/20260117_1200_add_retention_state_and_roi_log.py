"""add_retention_state_and_roi_log

Revision ID: 20260117_1200
Revises: 087549c1c6ca
Create Date: 2026-01-17 12:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260117_1200"
down_revision = "087549c1c6ca"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_retention_state",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("churn_probability_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("predicted_ltv", sa.Float(), nullable=False, server_default="0"),
        sa.Column("current_win_loss_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("session_balance_delta", sa.Float(), nullable=False, server_default="0"),
        sa.Column("bet_size_variation_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("loyalty_frequency_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "psychological_state",
            sa.Enum("IN_FLOW", "BORED", "FRUSTRATED", "TILTED", name="retention_psych_state"),
            nullable=False,
            server_default="IN_FLOW",
        ),
        sa.Column(
            "user_segment_tag",
            sa.Enum("HIGH_ROLLER", "CASUAL_LOYAL", "NEW_USER", "CHURN_RISK", name="retention_segment_tag"),
            nullable=False,
            server_default="NEW_USER",
        ),
        sa.Column("last_intervention_at", sa.DateTime(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
            onupdate=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    op.create_table(
        "retention_roi_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("predicted_ltv", sa.Float(), nullable=False, server_default="0"),
        sa.Column("marketing_cost", sa.Float(), nullable=False, server_default="0"),
        sa.Column("roi_percent", sa.Float(), nullable=False, server_default="0"),
        sa.Column("event_type", sa.String(length=50), nullable=True),
        sa.Column("reward_type", sa.String(length=50), nullable=True),
        sa.Column("reward_amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index("ix_retention_roi_log_user_id", "retention_roi_log", ["user_id"])
    op.create_index("ix_retention_roi_log_created_at", "retention_roi_log", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_retention_roi_log_created_at", table_name="retention_roi_log")
    op.drop_index("ix_retention_roi_log_user_id", table_name="retention_roi_log")
    op.drop_table("retention_roi_log")
    op.drop_table("user_retention_state")
