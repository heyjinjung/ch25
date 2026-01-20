"""add v2 user table

Revision ID: 20260119_1400
Revises: 20260119_1200
Create Date: 2026-01-19 14:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260119_1400"
down_revision = "20260119_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "v2_user",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cc_id", sa.String(length=100), nullable=False, unique=True),
        sa.Column("nickname", sa.String(length=100), nullable=True),
        sa.Column("telegram_id", sa.BigInteger(), nullable=True),
        sa.Column("telegram_username", sa.String(length=100), nullable=True),
        sa.Column("vault_locked_balance", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_v2_user_nickname", "v2_user", ["nickname"])
    op.create_index("ix_v2_user_telegram_id", "v2_user", ["telegram_id"])
    op.create_index("ix_v2_user_telegram_username", "v2_user", ["telegram_username"])


def downgrade() -> None:
    op.drop_index("ix_v2_user_telegram_username", table_name="v2_user")
    op.drop_index("ix_v2_user_telegram_id", table_name="v2_user")
    op.drop_index("ix_v2_user_nickname", table_name="v2_user")
    op.drop_table("v2_user")
