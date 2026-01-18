"""add user total_charge_amount

Revision ID: 20260101_1300
Revises: 7c800648429f
Create Date: 2026-01-01 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260101_1300'
down_revision = '7c800648429f'
branch_labels = None
depends_on = None


def upgrade():
    # Helper to check if column exists before adding to avoid errors in dev envs
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('user')]
    if 'total_charge_amount' not in columns:
        op.add_column('user', sa.Column('total_charge_amount', sa.Integer(), server_default='0', nullable=False))


def downgrade():
    op.drop_column('user', 'total_charge_amount')
