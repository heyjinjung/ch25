"""Add ops_target_list and ops_target_member tables

Revision ID: 20260113_1804_add_ops_target
Revises: 20260113_0930_add_user_identity_history
Create Date: 2026-01-13 18:04:00.000000

Based on spec: docs/06_ops/202601/20260113_ops_crisis_scenarios_spec.md
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '20260113_1804_add_ops_target'
down_revision = '20260113_0930_add_user_identity_history'
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
    # Create ops_target_list table
    if not _table_exists('ops_target_list'):
        op.create_table(
            'ops_target_list',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('plan_id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=200), nullable=False),
            sa.Column('source_type', sa.String(length=50), nullable=False),
            sa.Column('source_params', mysql.JSON(), nullable=True),
            sa.Column('count_snapshot', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('is_processed', sa.Boolean(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['plan_id'], ['ops_plan.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

    ops_target_list_id_idx = op.f('ix_ops_target_list_id')
    ops_target_list_plan_id_idx = op.f('ix_ops_target_list_plan_id')
    if _table_exists('ops_target_list') and not _index_exists('ops_target_list', ops_target_list_id_idx):
        op.create_index(ops_target_list_id_idx, 'ops_target_list', ['id'], unique=False)
    if _table_exists('ops_target_list') and not _index_exists('ops_target_list', ops_target_list_plan_id_idx):
        op.create_index(ops_target_list_plan_id_idx, 'ops_target_list', ['plan_id'], unique=False)

    # Create ops_target_member table
    if not _table_exists('ops_target_member'):
        op.create_table(
            'ops_target_member',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('target_list_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='PENDING'),
            sa.Column('data', mysql.JSON(), nullable=True),
            sa.Column('result_status', sa.String(length=20), nullable=False, server_default='NONE'),
            sa.Column('converted_at', sa.DateTime(), nullable=True),
            sa.Column('conversion_value', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['target_list_id'], ['ops_target_list.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('target_list_id', 'user_id', name='uq_target_member_list_user')
        )

    ops_target_member_id_idx = op.f('ix_ops_target_member_id')
    ops_target_member_target_list_id_idx = op.f('ix_ops_target_member_target_list_id')
    ops_target_member_user_id_idx = op.f('ix_ops_target_member_user_id')
    if _table_exists('ops_target_member') and not _index_exists('ops_target_member', ops_target_member_id_idx):
        op.create_index(ops_target_member_id_idx, 'ops_target_member', ['id'], unique=False)
    if _table_exists('ops_target_member') and not _index_exists('ops_target_member', ops_target_member_target_list_id_idx):
        op.create_index(ops_target_member_target_list_id_idx, 'ops_target_member', ['target_list_id'], unique=False)
    if _table_exists('ops_target_member') and not _index_exists('ops_target_member', ops_target_member_user_id_idx):
        op.create_index(ops_target_member_user_id_idx, 'ops_target_member', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_ops_target_member_user_id'), table_name='ops_target_member')
    op.drop_index(op.f('ix_ops_target_member_target_list_id'), table_name='ops_target_member')
    op.drop_index(op.f('ix_ops_target_member_id'), table_name='ops_target_member')
    op.drop_table('ops_target_member')
    
    op.drop_index(op.f('ix_ops_target_list_plan_id'), table_name='ops_target_list')
    op.drop_index(op.f('ix_ops_target_list_id'), table_name='ops_target_list')
    op.drop_table('ops_target_list')
