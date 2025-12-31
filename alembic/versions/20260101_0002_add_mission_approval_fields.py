"""Add approval fields
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

def upgrade() -> None:
    # Check if column exists to be safe, or just add it.
    # add_column will fail if exists.
    # We assume it doesn't exist based on 500 error logs.
    op.add_column("mission", sa.Column("requires_approval", sa.Boolean(), nullable=True, server_default="0"))
    op.add_column("user_mission_progress", sa.Column("approval_status", sa.Enum('NONE','PENDING','APPROVED','REJECTED', name='approvalstatus'), server_default='NONE', nullable=False))

def downgrade() -> None:
    op.drop_column("mission", "requires_approval")
    op.drop_column("user_mission_progress", "approval_status")
