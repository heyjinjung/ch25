"""Add v2_hq_daily_withdrawal_log table

Revision ID: 20260205_0200_add_v2_hq_daily_withdrawal_log
Revises: 20260205_0100_add_v2_spending_ledger
Create Date: 2026-02-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = "20260205_0200_add_v2_hq_daily_withdrawal_log"
down_revision = "20260205_0100_add_v2_spending_ledger"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    if "v2_hq_daily_withdrawal_log" in existing_tables:
        return

    op.create_table(
        "v2_hq_daily_withdrawal_log",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("dedup_key", sa.String(length=64), nullable=False),
        sa.Column("nickname", sa.String(length=100), nullable=False),
        sa.Column("cc_id", sa.String(length=100), nullable=True),
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("bet_amount", sa.BigInteger(), nullable=True),
        sa.Column("request_at", sa.DateTime(), nullable=True),
        sa.Column("withdrawal_at", sa.DateTime(), nullable=False),
        sa.Column("referrer_code", sa.String(length=50), nullable=True),
        sa.Column("hq_status", sa.String(length=20), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("match_status", sa.String(length=20), nullable=False, server_default="NOT_FOUND"),
        sa.Column("import_batch_id", sa.String(length=36), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["v2_user.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dedup_key", name="uq_hq_withdrawal_dedup"),
        comment="V2 HQ 일일 환전 로그",
    )

    op.create_index("idx_hq_withdrawal_user_id", "v2_hq_daily_withdrawal_log", ["user_id"], unique=False)
    op.create_index("idx_hq_withdrawal_date", "v2_hq_daily_withdrawal_log", ["withdrawal_at"], unique=False)
    op.create_index("idx_hq_withdrawal_batch", "v2_hq_daily_withdrawal_log", ["import_batch_id"], unique=False)
    op.create_index("idx_hq_withdrawal_nickname", "v2_hq_daily_withdrawal_log", ["nickname"], unique=False)
    op.create_index("idx_hq_withdrawal_dedup", "v2_hq_daily_withdrawal_log", ["dedup_key"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_hq_withdrawal_dedup", table_name="v2_hq_daily_withdrawal_log")
    op.drop_index("idx_hq_withdrawal_nickname", table_name="v2_hq_daily_withdrawal_log")
    op.drop_index("idx_hq_withdrawal_batch", table_name="v2_hq_daily_withdrawal_log")
    op.drop_index("idx_hq_withdrawal_date", table_name="v2_hq_daily_withdrawal_log")
    op.drop_index("idx_hq_withdrawal_user_id", table_name="v2_hq_daily_withdrawal_log")
    op.drop_table("v2_hq_daily_withdrawal_log")
