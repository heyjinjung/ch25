"""Add ops_eval_metrics table

Revision ID: 20260116_0900_add_ops_eval_metrics
Revises: 20260115_2259_8ff0ec49f5ea_add_point_reward_type
Create Date: 2026-01-16 09:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '20260116_0900_add_ops_eval_metrics'
down_revision = '20260115_2259_8ff0ec49f5ea_add_point_reward_type'
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return bool(inspector.has_table(table_name))


def _index_exists(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    try:
        indexes = inspector.get_indexes(table_name)
    except Exception:
        return False
    return any(idx.get("name") == index_name for idx in indexes)


def upgrade() -> None:
    # Create ops_eval_metrics table
    if not _table_exists('ops_eval_metrics'):
        op.create_table(
            'ops_eval_metrics',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('plan_id', sa.Integer(), nullable=False),
            sa.Column('eval_type', sa.String(length=10), nullable=False),
            sa.Column('metrics_json', mysql.JSON(), nullable=False),
            sa.Column('grade', sa.String(length=5), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['plan_id'], ['ops_plan.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

    ops_eval_metrics_plan_eval_type_idx = 'ix_ops_eval_metrics_plan_eval_type'
    ops_eval_metrics_created_at_idx = 'ix_ops_eval_metrics_created_at'

    if _table_exists('ops_eval_metrics') and not _index_exists('ops_eval_metrics', ops_eval_metrics_plan_eval_type_idx):
        op.create_index(ops_eval_metrics_plan_eval_type_idx, 'ops_eval_metrics', ['plan_id', 'eval_type'], unique=False)
    
    if _table_exists('ops_eval_metrics') and not _index_exists('ops_eval_metrics', ops_eval_metrics_created_at_idx):
        op.create_index(ops_eval_metrics_created_at_idx, 'ops_eval_metrics', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_ops_eval_metrics_created_at', table_name='ops_eval_metrics')
    op.drop_index('ix_ops_eval_metrics_plan_eval_type', table_name='ops_eval_metrics')
    op.drop_table('ops_eval_metrics')
