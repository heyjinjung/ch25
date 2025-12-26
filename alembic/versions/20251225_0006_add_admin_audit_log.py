"""add admin audit log (clean)

Revision ID: 20251225_0006
Revises: 20251225_0005
Create Date: 2025-12-25 16:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '20251225_0006'
down_revision = '20251225_0005'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table('admin_audit_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('admin_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('target_type', sa.String(length=50), nullable=True),
        sa.Column('target_id', sa.String(length=100), nullable=True),
        sa.Column('before_json', sa.JSON().with_variant(mysql.JSON(), 'mysql'), nullable=True),
        sa.Column('after_json', sa.JSON().with_variant(mysql.JSON(), 'mysql'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admin_audit_log_admin_id'), 'admin_audit_log', ['admin_id'], unique=False)
    op.create_index(op.f('ix_admin_audit_log_id'), 'admin_audit_log', ['id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_admin_audit_log_id'), table_name='admin_audit_log')
    op.drop_index(op.f('ix_admin_audit_log_admin_id'), table_name='admin_audit_log')
    op.drop_table('admin_audit_log')
