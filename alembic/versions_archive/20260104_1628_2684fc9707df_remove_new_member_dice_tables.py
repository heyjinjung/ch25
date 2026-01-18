"""remove_new_member_dice_tables

Revision ID: 2684fc9707df
Revises: 20260104_0001
Create Date: 2026-01-04 16:28:12.422254+09:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2684fc9707df'
down_revision = '20260104_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table('new_member_dice_log')
    op.drop_table('new_member_dice_eligibility')


def downgrade() -> None:
    pass
