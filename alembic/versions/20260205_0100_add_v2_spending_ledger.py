"""Add v2_spending_ledger table

Revision ID: 20260205_0100_add_v2_spending_ledger
Revises: 20260204_0400_add_xp_to_v2_user
Create Date: 2026-02-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = "20260205_0100_add_v2_spending_ledger"
down_revision = "20260204_0400_add_xp_to_v2_user"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    if "v2_spending_ledger" in existing_tables:
        return

    op.create_table(
        "v2_spending_ledger",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("transaction_id", sa.String(length=100), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("currency_type", sa.String(length=20), nullable=False),
        sa.Column("converted_krw_amount", sa.BigInteger(), nullable=False),
        sa.Column("spending_source", sa.String(length=20), nullable=False),
        sa.Column("kst_date", sa.Date(), nullable=False),
        sa.Column("metadata", mysql.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["v2_user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("transaction_id", name="uq_spending_transaction"),
        sa.CheckConstraint(
            "spending_source IN ('HQ_W', 'VAULT_W', 'SHOP_U')",
            name="chk_spending_source",
        ),
        sa.CheckConstraint(
            "currency_type IN ('KRW', 'POINT', 'G_W')",
            name="chk_currency_type",
        ),
        comment="V2 지출 통합 원장",
    )

    op.create_index("idx_spending_user_id", "v2_spending_ledger", ["user_id"], unique=False)
    op.create_index("idx_spending_kst_date", "v2_spending_ledger", ["kst_date"], unique=False)
    op.create_index("idx_spending_source", "v2_spending_ledger", ["spending_source"], unique=False)
    op.create_index("idx_spending_created_at", "v2_spending_ledger", ["created_at"], unique=False)
    op.create_index("idx_spending_date_source", "v2_spending_ledger", ["kst_date", "spending_source"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_spending_date_source", table_name="v2_spending_ledger")
    op.drop_index("idx_spending_created_at", table_name="v2_spending_ledger")
    op.drop_index("idx_spending_source", table_name="v2_spending_ledger")
    op.drop_index("idx_spending_kst_date", table_name="v2_spending_ledger")
    op.drop_index("idx_spending_user_id", table_name="v2_spending_ledger")
    op.drop_table("v2_spending_ledger")
