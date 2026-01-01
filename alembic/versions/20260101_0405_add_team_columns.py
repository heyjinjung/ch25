"""Add missing columns to team table

Revision ID: 20260101_0405
Revises: 20260101_0404
Create Date: 2026-01-01 12:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = '20260101_0405'
down_revision = '20260101_0404'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [col['name'] for col in inspector.get_columns('team')]

    if 'icon' not in columns:
        op.add_column('team', sa.Column('icon', sa.String(length=255), nullable=True))
    
    if 'is_active' not in columns:
        op.add_column('team', sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False))
        
    if 'created_at' not in columns:
        op.add_column('team', sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False))
        
    if 'updated_at' not in columns:
        op.add_column('team', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False))


def downgrade():
    # Only drop if we are sure? Hard to safely downgrade conditional upgrades.
    # For now, we allow dropping them if they exist.
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [col['name'] for col in inspector.get_columns('team')]

    if 'updated_at' in columns:
        op.drop_column('team', 'updated_at')
    if 'created_at' in columns:
        op.drop_column('team', 'created_at')
    if 'is_active' in columns:
        op.drop_column('team', 'is_active')
    if 'icon' in columns:
        op.drop_column('team', 'icon')
