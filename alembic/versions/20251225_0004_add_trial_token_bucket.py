"""Add trial_token_bucket table.

Revision ID: 20251225_0004
Revises: 20251225_0003
Create Date: 2025-12-25

Tracks the remaining count of tokens that were granted via TRIAL_GRANT,
so gameplay can accurately route trial rewards to Vault.
"""

from alembic import op
import sqlalchemy as sa

revision = "20251225_0004"
down_revision = "20251225_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "trial_token_bucket",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_type", sa.Enum("ROULETTE_COIN", "DICE_TOKEN", "LOTTERY_TICKET", "CC_COIN", name="gametokentype"), nullable=False),
        sa.Column("balance", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("user_id", "token_type", name="uq_trial_token_bucket_user_token"),
    )
    op.create_index("ix_trial_token_bucket_user_id", "trial_token_bucket", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_trial_token_bucket_user_id", table_name="trial_token_bucket")
    op.drop_table("trial_token_bucket")
