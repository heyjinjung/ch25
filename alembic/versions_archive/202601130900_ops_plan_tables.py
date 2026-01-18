"""create ops plan tables

Revision ID: 202601130900_ops_plan_tables
Revises: 202601120900_ops_log_tables
Create Date: 2026-01-13 09:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = "202601130900_ops_plan_tables"
down_revision = "202601120900_ops_log_tables"
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
    if not _table_exists("ops_campaign"):
        op.create_table(
            "ops_campaign",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="DRAFT"),
            sa.Column("start_date", sa.Date(), nullable=True),
            sa.Column("end_date", sa.Date(), nullable=True),
            sa.Column("owner_admin_id", sa.Integer(), nullable=True),
            sa.Column("goal_json", sa.JSON().with_variant(mysql.JSON(), "mysql"), nullable=True),
            sa.Column("notes_md", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
                server_onupdate=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
        )

    ops_campaign_id_idx = op.f("ix_ops_campaign_id")
    if _table_exists("ops_campaign") and not _index_exists("ops_campaign", ops_campaign_id_idx):
        op.create_index(ops_campaign_id_idx, "ops_campaign", ["id"], unique=False)

    if not _table_exists("ops_plan"):
        op.create_table(
            "ops_plan",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("campaign_id", sa.Integer(), nullable=False),
            sa.Column("plan_date", sa.Date(), nullable=False),
            sa.Column("theme_title", sa.String(length=200), nullable=True),
            sa.Column("key_message", sa.String(length=500), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="DRAFT"),
            sa.Column("closing_summary_md", sa.Text(), nullable=True),
            sa.Column("kpi_snapshot_json", sa.JSON().with_variant(mysql.JSON(), "mysql"), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
                server_onupdate=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.ForeignKeyConstraint(["campaign_id"], ["ops_campaign.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("campaign_id", "plan_date", name="uq_ops_plan_campaign_date"),
        )

    ops_plan_id_idx = op.f("ix_ops_plan_id")
    ops_plan_campaign_id_idx = op.f("ix_ops_plan_campaign_id")
    ops_plan_plan_date_idx = op.f("ix_ops_plan_plan_date")
    ops_plan_campaign_date_uq = "uq_ops_plan_campaign_date"

    if _table_exists("ops_plan") and not _index_exists("ops_plan", ops_plan_id_idx):
        op.create_index(ops_plan_id_idx, "ops_plan", ["id"], unique=False)
    if _table_exists("ops_plan") and not _index_exists("ops_plan", ops_plan_campaign_id_idx):
        op.create_index(ops_plan_campaign_id_idx, "ops_plan", ["campaign_id"], unique=False)
    if _table_exists("ops_plan") and not _index_exists("ops_plan", ops_plan_plan_date_idx):
        op.create_index(ops_plan_plan_date_idx, "ops_plan", ["plan_date"], unique=False)
    if _table_exists("ops_plan") and not _index_exists("ops_plan", ops_plan_campaign_date_uq):
        op.create_index(ops_plan_campaign_date_uq, "ops_plan", ["campaign_id", "plan_date"], unique=True)

    if not _table_exists("ops_plan_task"):
        op.create_table(
            "ops_plan_task",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("plan_id", sa.Integer(), nullable=False),
            sa.Column("slot_time", sa.String(length=10), nullable=True),
            sa.Column("title", sa.String(length=300), nullable=False),
            sa.Column("type", sa.String(length=30), nullable=False, server_default="NOTE"),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="TODO"),
            sa.Column("memo", sa.Text(), nullable=True),
            sa.Column("payload_json", sa.JSON().with_variant(mysql.JSON(), "mysql"), nullable=True),
            sa.Column("executed_at", sa.DateTime(), nullable=True),
            sa.Column("actor_admin_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
                server_onupdate=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.ForeignKeyConstraint(["plan_id"], ["ops_plan.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    ops_plan_task_id_idx = op.f("ix_ops_plan_task_id")
    ops_plan_task_plan_id_idx = op.f("ix_ops_plan_task_plan_id")
    ops_plan_task_plan_id_status_idx = "ix_ops_plan_task_plan_id_status"

    if _table_exists("ops_plan_task") and not _index_exists("ops_plan_task", ops_plan_task_id_idx):
        op.create_index(ops_plan_task_id_idx, "ops_plan_task", ["id"], unique=False)
    if _table_exists("ops_plan_task") and not _index_exists("ops_plan_task", ops_plan_task_plan_id_idx):
        op.create_index(ops_plan_task_plan_id_idx, "ops_plan_task", ["plan_id"], unique=False)
    if _table_exists("ops_plan_task") and not _index_exists("ops_plan_task", ops_plan_task_plan_id_status_idx):
        op.create_index(ops_plan_task_plan_id_status_idx, "ops_plan_task", ["plan_id", "status"], unique=False)


def downgrade() -> None:
    if _table_exists("ops_plan_task"):
        ops_plan_task_id_idx = op.f("ix_ops_plan_task_id")
        ops_plan_task_plan_id_idx = op.f("ix_ops_plan_task_plan_id")
        ops_plan_task_plan_id_status_idx = "ix_ops_plan_task_plan_id_status"
        if _index_exists("ops_plan_task", ops_plan_task_plan_id_status_idx):
            op.drop_index(ops_plan_task_plan_id_status_idx, table_name="ops_plan_task")
        if _index_exists("ops_plan_task", ops_plan_task_plan_id_idx):
            op.drop_index(ops_plan_task_plan_id_idx, table_name="ops_plan_task")
        if _index_exists("ops_plan_task", ops_plan_task_id_idx):
            op.drop_index(ops_plan_task_id_idx, table_name="ops_plan_task")
        op.drop_table("ops_plan_task")

    if _table_exists("ops_plan"):
        ops_plan_id_idx = op.f("ix_ops_plan_id")
        ops_plan_campaign_id_idx = op.f("ix_ops_plan_campaign_id")
        ops_plan_plan_date_idx = op.f("ix_ops_plan_plan_date")
        ops_plan_campaign_date_uq = "uq_ops_plan_campaign_date"
        if _index_exists("ops_plan", ops_plan_campaign_date_uq):
            op.drop_index(ops_plan_campaign_date_uq, table_name="ops_plan")
        if _index_exists("ops_plan", ops_plan_plan_date_idx):
            op.drop_index(ops_plan_plan_date_idx, table_name="ops_plan")
        if _index_exists("ops_plan", ops_plan_campaign_id_idx):
            op.drop_index(ops_plan_campaign_id_idx, table_name="ops_plan")
        if _index_exists("ops_plan", ops_plan_id_idx):
            op.drop_index(ops_plan_id_idx, table_name="ops_plan")
        op.drop_table("ops_plan")

    if _table_exists("ops_campaign"):
        ops_campaign_id_idx = op.f("ix_ops_campaign_id")
        if _index_exists("ops_campaign", ops_campaign_id_idx):
            op.drop_index(ops_campaign_id_idx, table_name="ops_campaign")
        op.drop_table("ops_campaign")
