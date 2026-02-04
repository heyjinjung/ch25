"""Add v2_external_deposit_unmatched table for HQ Margin CC Deposit auto-reflection

Revision ID: 20260203_1000_add_v2_external_deposit_unmatched
Revises: 20260202_1530_extend_v2_user_segment
Create Date: 2026-02-03 10:00:00+09:00

설계 문서: v2_golden_hq_margin_cc_deposit_auto_reflection_design_ko.md
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260203_1000_add_v2_external_deposit_unmatched'
down_revision = '20260203_0100_add_baseline_charge_amount'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create v2_external_deposit_unmatched table for tracking unmatched HQ CSV deposits."""
    op.create_table(
        'v2_external_deposit_unmatched',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('source', sa.String(50), nullable=False, server_default='HQ_MARGIN'),
        sa.Column('raw_cc_id', sa.String(100), nullable=False),
        sa.Column('raw_nickname', sa.String(100), nullable=True),
        sa.Column('total_charge', sa.BigInteger(), nullable=False),
        sa.Column('prev_total', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('delta', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('kst_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='UNMATCHED'),
        sa.Column('matched_user_id', sa.Integer(), sa.ForeignKey('v2_user.id', ondelete='SET NULL'), nullable=True),
        sa.Column('matched_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reason', sa.String(200), nullable=True),
        sa.Column('admin_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # 인덱스 생성
    op.create_index('idx_unmatched_kst_date', 'v2_external_deposit_unmatched', ['kst_date'])
    op.create_index('idx_unmatched_status', 'v2_external_deposit_unmatched', ['status'])
    op.create_index('idx_unmatched_created', 'v2_external_deposit_unmatched', ['created_at'])
    op.create_index('idx_unmatched_source_status', 'v2_external_deposit_unmatched', ['source', 'status'])


def downgrade() -> None:
    """Drop v2_external_deposit_unmatched table."""
    op.drop_index('idx_unmatched_source_status', table_name='v2_external_deposit_unmatched')
    op.drop_index('idx_unmatched_created', table_name='v2_external_deposit_unmatched')
    op.drop_index('idx_unmatched_status', table_name='v2_external_deposit_unmatched')
    op.drop_index('idx_unmatched_kst_date', table_name='v2_external_deposit_unmatched')
    op.drop_table('v2_external_deposit_unmatched')
