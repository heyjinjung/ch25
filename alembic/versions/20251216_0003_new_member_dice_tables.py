"""Add new-member dice eligibility/log tables

Revision ID: 20251216_0003
Revises: 20251207_0002
Create Date: 2025-12-16
"""

from alembic import op
import sqlalchemy as sa

revision = "20251216_0003"
down_revision = "20251207_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "new_member_dice_eligibility",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("is_eligible", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("campaign_key", sa.String(length=50), nullable=True),
        sa.Column("granted_by", sa.String(length=100), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("user_id", name="uq_new_member_dice_eligibility_user_id"),
    )
    op.create_index(
        "ix_new_member_dice_eligibility_user_id",
        "new_member_dice_eligibility",
        ["user_id"],
    )

    op.create_table(
        "new_member_dice_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("campaign_key", sa.String(length=50), nullable=True),
        sa.Column("outcome", sa.String(length=10), nullable=False),
        sa.Column("user_dice", sa.Integer(), nullable=False),
        sa.Column("dealer_dice", sa.Integer(), nullable=False),
        sa.Column("win_link", sa.String(length=200), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("user_id", name="uq_new_member_dice_log_user_id"),
    )
    op.create_index(
        "ix_new_member_dice_log_user_created_at",
        "new_member_dice_log",
        ["user_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_new_member_dice_log_user_created_at", table_name="new_member_dice_log")
    op.drop_table("new_member_dice_log")

    op.drop_index("ix_new_member_dice_eligibility_user_id", table_name="new_member_dice_eligibility")
    op.drop_table("new_member_dice_eligibility")
