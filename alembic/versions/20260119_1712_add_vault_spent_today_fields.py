"""add vault spent today fields

Revision ID: 20260119_1712
Revises: 20260119_1711
Create Date: 2026-01-19 17:12:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = "20260119_1712"
down_revision = "20260119_1711"
branch_labels = None
depends_on = None


def column_exists(conn, table_name: str, column_name: str) -> bool:
    """Check if a column exists in the table (MySQL compatible)."""
    result = conn.execute(text(
        f"SELECT COUNT(*) FROM information_schema.COLUMNS "
        f"WHERE TABLE_SCHEMA = DATABASE() "
        f"AND TABLE_NAME = '{table_name}' "
        f"AND COLUMN_NAME = '{column_name}'"
    ))
    return result.scalar() > 0


def upgrade() -> None:
    # Add vault_spent_today fields to user (MySQL compatible)
    conn = op.get_bind()
    
    if not column_exists(conn, "user", "vault_spent_today"):
        op.add_column("user", sa.Column("vault_spent_today", sa.Integer(), nullable=False, server_default="0"))
    
    if not column_exists(conn, "user", "vault_spent_reset_date"):
        op.add_column("user", sa.Column("vault_spent_reset_date", sa.String(10), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    
    if column_exists(conn, "user", "vault_spent_reset_date"):
        op.drop_column("user", "vault_spent_reset_date")
    
    if column_exists(conn, "user", "vault_spent_today"):
        op.drop_column("user", "vault_spent_today")
