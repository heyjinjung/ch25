"""merge_heads

Revision ID: 125c25c8ddb4
Revises: 20260113_1804_add_ops_target, 20260114_0004_disable_legacy_new_user_missions_fix
Create Date: 2026-01-14 16:25:59.553752+09:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '125c25c8ddb4'
down_revision = ('20260113_1804_add_ops_target', '20260114_0004_disable_legacy_new_user_missions_fix')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
