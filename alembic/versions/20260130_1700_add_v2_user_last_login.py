"""Add last_login_at to v2_user for analytics/retention.

Revision ID: 20260130_1700_add_v2_user_last_login
Revises: 20260130_1600_sync_v2_user_vault
Create Date: 2026-01-30

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260130_1700_add_v2_user_last_login'
down_revision = '20260130_1600_sync_v2_user_vault'
branch_labels = None
depends_on = None


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table (MySQL compatible)."""
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    # Add last_login_at column if not exists
    if not column_exists('v2_user', 'last_login_at'):
        op.add_column('v2_user', sa.Column('last_login_at', sa.DateTime(), nullable=True))
        op.create_index('ix_v2_user_last_login_at', 'v2_user', ['last_login_at'])
    
    # Sync last_login_at from legacy user table
    op.execute("""
        UPDATE v2_user v
        INNER JOIN user u ON v.id = u.id
        SET v.last_login_at = u.last_login_at
        WHERE v.last_login_at IS NULL AND u.last_login_at IS NOT NULL
    """)


def downgrade() -> None:
    if column_exists('v2_user', 'last_login_at'):
        op.drop_index('ix_v2_user_last_login_at', 'v2_user')
        op.drop_column('v2_user', 'last_login_at')
