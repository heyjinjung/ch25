"""add_v2_user_status_role_columns

Revision ID: 20260130_1500
Revises: 
Create Date: 2026-01-30

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260130_1500_add_v2_user_status_role'
down_revision = '96be4ed554ee'
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
    # Add status column to v2_user if not exists
    if not column_exists('v2_user', 'status'):
        op.add_column(
            'v2_user',
            sa.Column(
                'status',
                sa.Enum('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ADMIN', name='v2userstatus'),
                nullable=False,
                server_default='ACTIVE'
            )
        )
    
    # Add role column to v2_user if not exists
    if not column_exists('v2_user', 'role'):
        op.add_column(
            'v2_user',
            sa.Column(
                'role',
                sa.Enum('USER', 'ADMIN', 'SUPER_ADMIN', name='v2userrole'),
                nullable=False,
                server_default='USER'
            )
        )


def downgrade() -> None:
    # Remove columns if they exist
    if column_exists('v2_user', 'role'):
        op.drop_column('v2_user', 'role')
    if column_exists('v2_user', 'status'):
        op.drop_column('v2_user', 'status')
