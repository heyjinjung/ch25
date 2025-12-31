"""Add approval fields and user_mission_progress table
Revision ID: add_mission_approval
Revises: add_diamond_key_count
Create Date: 2026-01-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision = "add_mission_approval"
down_revision = "add_diamond_key_count"
branch_labels = None
depends_on = None

from sqlalchemy import text

def _column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    return bool(
        conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = :table
                  AND column_name = :column
                """
            ),
            {"table": table, "column": column},
        ).scalar()
    )

def _table_exists(table: str) -> bool:
    conn = op.get_bind()
    return bool(
        conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = DATABASE()
                  AND table_name = :table
                """
            ),
            {"table": table},
        ).scalar()
    )


def upgrade() -> None:
    # Add requires_approval column to mission table
    if not _column_exists('mission', 'requires_approval'):
        op.add_column("mission", sa.Column("requires_approval", sa.Boolean(), nullable=True, server_default="0"))
    
    # Create user_mission_progress table
    if not _table_exists('user_mission_progress'):
        op.create_table(
            "user_mission_progress",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("mission_id", sa.Integer(), sa.ForeignKey("mission.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("current_value", sa.Integer(), nullable=False, default=0),
            sa.Column("is_completed", sa.Boolean(), default=False),
            sa.Column("is_claimed", sa.Boolean(), default=False),
            sa.Column("approval_status", sa.Enum('NONE','PENDING','APPROVED','REJECTED', name='approvalstatus'), server_default='NONE', nullable=False),
            sa.Column("reset_date", sa.String(50), nullable=False, index=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("user_id", "mission_id", "reset_date", name="uq_user_mission_reset"),
        )

def downgrade() -> None:
    op.drop_column("mission", "requires_approval")
    op.drop_table("user_mission_progress")

