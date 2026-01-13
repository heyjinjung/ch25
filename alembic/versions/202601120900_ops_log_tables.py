"""create ops log tables

Revision ID: 202601120900_ops_log_tables
Revises: 20260110_1200_ext_rank_delta
Create Date: 2026-01-12 09:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = "202601120900_ops_log_tables"
down_revision = "20260110_1200_ext_rank_delta"
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return bool(inspector.has_table(table_name))


def _index_exists(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    try:
        indexes = inspector.get_indexes(table_name)
    except Exception:
        return False
    return any(idx.get("name") == index_name for idx in indexes)


def upgrade() -> None:
    if not _table_exists("ops_daily_log"):
        op.create_table(
            "ops_daily_log",
            sa.Column("date", sa.Date(), nullable=False),
            sa.Column("theme_title", sa.String(length=200), nullable=True),
            sa.Column("manager_id", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="DRAFT"),
            sa.Column("summary_md", sa.String(length=5000), nullable=True),
            sa.Column("kpi_snapshot", sa.JSON().with_variant(mysql.JSON(), "mysql"), nullable=True),
            sa.PrimaryKeyConstraint("date"),
        )

    daily_log_date_idx = op.f("ix_ops_daily_log_date")
    if _table_exists("ops_daily_log") and not _index_exists("ops_daily_log", daily_log_date_idx):
        op.create_index(daily_log_date_idx, "ops_daily_log", ["date"], unique=False)

    if not _table_exists("ops_log_entry"):
        op.create_table(
            "ops_log_entry",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("daily_log_date", sa.Date(), nullable=False),
            sa.Column("timestamp", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("category", sa.String(length=50), nullable=False),
            sa.Column("action_code", sa.String(length=100), nullable=False),
            sa.Column("target_model", sa.String(length=50), nullable=False, server_default="NONE"),
            sa.Column("target_id", sa.String(length=100), nullable=True),
            sa.Column(
                "meta_data",
                sa.JSON().with_variant(mysql.JSON(), "mysql"),
                nullable=False,
                server_default=sa.text("('{}')"),
            ),
            sa.Column("is_automated", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("actor_id", sa.Integer(), nullable=False),
            sa.Column("ref_id", sa.String(length=100), nullable=True),
            sa.ForeignKeyConstraint(["daily_log_date"], ["ops_daily_log.date"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    log_daily_log_date_idx = op.f("ix_ops_log_entry_daily_log_date")
    log_timestamp_idx = op.f("ix_ops_log_entry_timestamp")
    log_target_id_idx = op.f("ix_ops_log_entry_target_id")
    log_ref_id_unique_idx = "ix_ops_log_entry_ref_id_unique"

    if _table_exists("ops_log_entry") and not _index_exists("ops_log_entry", log_daily_log_date_idx):
        op.create_index(log_daily_log_date_idx, "ops_log_entry", ["daily_log_date"], unique=False)
    if _table_exists("ops_log_entry") and not _index_exists("ops_log_entry", log_timestamp_idx):
        op.create_index(log_timestamp_idx, "ops_log_entry", ["timestamp"], unique=False)
    if _table_exists("ops_log_entry") and not _index_exists("ops_log_entry", log_ref_id_unique_idx):
        op.create_index(log_ref_id_unique_idx, "ops_log_entry", ["ref_id"], unique=True)
    if _table_exists("ops_log_entry") and not _index_exists("ops_log_entry", log_target_id_idx):
        op.create_index(log_target_id_idx, "ops_log_entry", ["target_id"], unique=False)


def downgrade() -> None:
    if _table_exists("ops_log_entry"):
        log_daily_log_date_idx = op.f("ix_ops_log_entry_daily_log_date")
        log_timestamp_idx = op.f("ix_ops_log_entry_timestamp")
        log_target_id_idx = op.f("ix_ops_log_entry_target_id")
        log_ref_id_unique_idx = "ix_ops_log_entry_ref_id_unique"

        if _index_exists("ops_log_entry", log_ref_id_unique_idx):
            op.drop_index(log_ref_id_unique_idx, table_name="ops_log_entry")
        if _index_exists("ops_log_entry", log_target_id_idx):
            op.drop_index(log_target_id_idx, table_name="ops_log_entry")
        if _index_exists("ops_log_entry", log_timestamp_idx):
            op.drop_index(log_timestamp_idx, table_name="ops_log_entry")
        if _index_exists("ops_log_entry", log_daily_log_date_idx):
            op.drop_index(log_daily_log_date_idx, table_name="ops_log_entry")
        op.drop_table("ops_log_entry")

    if _table_exists("ops_daily_log"):
        daily_log_date_idx = op.f("ix_ops_daily_log_date")
        if _index_exists("ops_daily_log", daily_log_date_idx):
            op.drop_index(daily_log_date_idx, table_name="ops_daily_log")
        op.drop_table("ops_daily_log")
