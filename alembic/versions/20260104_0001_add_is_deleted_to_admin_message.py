"""add is_deleted to admin_message

Revision ID: 20260104_0001
Revises: 20260102_0001
Create Date: 2026-01-04 16:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260104_0001'
down_revision = '20260102_0001'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('admin_message', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('0')))


def downgrade():
    op.drop_column('admin_message', 'is_deleted')
