"""add vault spent today tracking

Revision ID: 3dabb97ccbef
Revises: 23cb59c1173f
Create Date: 2026-01-16 15:13:42.823663+09:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3dabb97ccbef'
down_revision = '23cb59c1173f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add vault_spent_today column
    op.add_column('user', sa.Column('vault_spent_today', sa.Integer(), nullable=False, server_default='0'))
    
    # Add vault_spent_reset_date column  
    op.add_column('user', sa.Column('vault_spent_reset_date', sa.String(10), nullable=True))


def downgrade() -> None:
    # Remove columns in reverse order
    op.drop_column('user', 'vault_spent_reset_date')
    op.drop_column('user', 'vault_spent_today')
