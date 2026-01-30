"""add_v2_user_password_hash

Revision ID: 20260130_1800
Revises: 20260130_1700
Create Date: 2026-01-30 18:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260130_1800_add_v2_user_password_hash'
down_revision = '20260130_1700_add_v2_user_last_login'
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
    # Add password_hash column to v2_user if not exists
    if not column_exists('v2_user', 'password_hash'):
        op.add_column(
            'v2_user',
            sa.Column('password_hash', sa.String(128), nullable=True)
        )


def downgrade() -> None:
    # Remove column if it exists
    if column_exists('v2_user', 'password_hash'):
        op.drop_column('v2_user', 'password_hash')
