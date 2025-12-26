"""Add vault_earn_event log table.

Revision ID: 20251225_0003
Revises: 20251223_0002
Create Date: 2025-12-25

Adds an idempotent earn-event log used to safely accrue Phase 1 vault locked balance.
"""

from alembic import op
import sqlalchemy as sa

revision = "20251225_0003"
down_revision = "20251223_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vault_earn_event",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("earn_event_id", sa.String(length=128), nullable=False),
        sa.Column("earn_type", sa.String(length=50), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column("reward_kind", sa.String(length=50), nullable=True),
        sa.Column("game_type", sa.String(length=50), nullable=True),
        sa.Column("token_type", sa.String(length=50), nullable=True),
        sa.Column("payout_raw_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("earn_event_id", name="uq_vault_earn_event_earn_event_id"),
    )
    op.create_index("ix_vault_earn_event_user_created_at", "vault_earn_event", ["user_id", "created_at"]) 


def downgrade() -> None:
    op.drop_index("ix_vault_earn_event_user_created_at", table_name="vault_earn_event")
    op.drop_table("vault_earn_event")
