"""Align Golden defaults and timestamps

Revision ID: 20260207_1900_align_golden_defaults
Revises: 20260205_0200_add_v2_hq_daily_withdrawal_log
Create Date: 2026-02-07 19:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = "20260207_1900_align_golden_defaults"
down_revision = "20260205_0200_add_v2_hq_daily_withdrawal_log"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    if "v2_golden_intervention_log" in existing_tables:
        op.alter_column(
            "v2_golden_intervention_log",
            "status",
            existing_type=sa.String(length=20),
            nullable=False,
            server_default=sa.text("'PENDING_APPROVAL'"),
        )

    if "v2_golden_daily_nudge" not in existing_tables:
        op.create_table(
            "v2_golden_daily_nudge",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("v2_user.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("scheduled_at", sa.DateTime(), nullable=False),
            sa.Column("message", sa.String(length=500), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'PENDING'")),
            sa.Column("sent_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
                server_onupdate=sa.text("CURRENT_TIMESTAMP"),
            ),
        )

    if "v2_game_log" in existing_tables:
        columns = {col["name"] for col in inspector.get_columns("v2_game_log")}
        if "created_at" not in columns:
            op.add_column(
                "v2_game_log",
                sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            )
        if "updated_at" not in columns:
            op.add_column(
                "v2_game_log",
                sa.Column(
                    "updated_at",
                    sa.DateTime(),
                    nullable=False,
                    server_default=sa.text("CURRENT_TIMESTAMP"),
                    server_onupdate=sa.text("CURRENT_TIMESTAMP"),
                ),
            )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    if "v2_game_log" in existing_tables:
        columns = {col["name"] for col in inspector.get_columns("v2_game_log")}
        if "updated_at" in columns:
            op.drop_column("v2_game_log", "updated_at")
        if "created_at" in columns:
            op.drop_column("v2_game_log", "created_at")

    if "v2_golden_daily_nudge" in existing_tables:
        op.drop_table("v2_golden_daily_nudge")

    if "v2_golden_intervention_log" in existing_tables:
        op.alter_column(
            "v2_golden_intervention_log",
            "status",
            existing_type=sa.String(length=20),
            nullable=False,
            server_default=None,
        )
