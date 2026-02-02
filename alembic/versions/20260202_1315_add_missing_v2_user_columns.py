"""add missing v2_user columns for model parity

Revision ID: 20260202_1315_add_missing_v2_user_columns
Revises: 20260201_0900_add_hq_prospective_user
Create Date: 2026-02-02 13:15:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260202_1315_add_missing_v2_user_columns"
down_revision = "20260201_0900_add_hq_prospective_user"
branch_labels = None
depends_on = None


def column_exists(table_name: str, column_name: str) -> bool:
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    # Add columns to match app.v2.models.user.V2User
    if not column_exists("v2_user", "vault_available_balance"):
        op.add_column(
            "v2_user",
            sa.Column("vault_available_balance", sa.Integer(), nullable=False, server_default="0"),
        )

    if not column_exists("v2_user", "level"):
        op.add_column(
            "v2_user",
            sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
        )

    if not column_exists("v2_user", "vault_spent_total"):
        op.add_column(
            "v2_user",
            sa.Column("vault_spent_total", sa.Integer(), nullable=False, server_default="0"),
        )

    if not column_exists("v2_user", "vault_spent_today"):
        op.add_column(
            "v2_user",
            sa.Column("vault_spent_today", sa.Integer(), nullable=False, server_default="0"),
        )

    if not column_exists("v2_user", "vault_spent_reset_date"):
        op.add_column(
            "v2_user",
            sa.Column("vault_spent_reset_date", sa.String(length=10), nullable=True),
        )

    if not column_exists("v2_user", "total_charge_amount"):
        op.add_column(
            "v2_user",
            sa.Column("total_charge_amount", sa.Integer(), nullable=False, server_default="0"),
        )

    if not column_exists("v2_user", "play_streak"):
        op.add_column(
            "v2_user",
            sa.Column("play_streak", sa.Integer(), nullable=False, server_default="0"),
        )

    if not column_exists("v2_user", "last_play_date"):
        op.add_column(
            "v2_user",
            sa.Column("last_play_date", sa.Date(), nullable=True),
        )

    if not column_exists("v2_user", "first_deposit_at"):
        op.add_column(
            "v2_user",
            sa.Column("first_deposit_at", sa.DateTime(), nullable=True),
        )

    if not column_exists("v2_user", "first_deposit_amount"):
        op.add_column(
            "v2_user",
            sa.Column("first_deposit_amount", sa.BigInteger(), nullable=True),
        )


def downgrade() -> None:
    # Downgrade removes newly added columns if they exist
    if column_exists("v2_user", "first_deposit_amount"):
        op.drop_column("v2_user", "first_deposit_amount")
    if column_exists("v2_user", "first_deposit_at"):
        op.drop_column("v2_user", "first_deposit_at")
    if column_exists("v2_user", "last_play_date"):
        op.drop_column("v2_user", "last_play_date")
    if column_exists("v2_user", "play_streak"):
        op.drop_column("v2_user", "play_streak")
    if column_exists("v2_user", "total_charge_amount"):
        op.drop_column("v2_user", "total_charge_amount")
    if column_exists("v2_user", "vault_spent_reset_date"):
        op.drop_column("v2_user", "vault_spent_reset_date")
    if column_exists("v2_user", "vault_spent_today"):
        op.drop_column("v2_user", "vault_spent_today")
    if column_exists("v2_user", "vault_spent_total"):
        op.drop_column("v2_user", "vault_spent_total")
    if column_exists("v2_user", "level"):
        op.drop_column("v2_user", "level")
    if column_exists("v2_user", "vault_available_balance"):
        op.drop_column("v2_user", "vault_available_balance")
