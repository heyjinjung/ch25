"""Extend v2_user_segment with HQ margin fields

Revision ID: 20260202_1530_extend_v2_user_segment
Revises: 20260202_1400_add_v2_game_log
Create Date: 2026-02-02 15:30:00+09:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260202_1530_extend_v2_user_segment'
down_revision = '20260202_1400_add_v2_game_log'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add HQ margin fields to v2_user_segment table."""
    # Add total_margin column
    op.add_column(
        'v2_user_segment',
        sa.Column('total_margin', sa.BigInteger(), nullable=True, server_default='0', comment='총 운영 마진 (충전 - 환전)')
    )
    
    # Add total_charge column
    op.add_column(
        'v2_user_segment',
        sa.Column('total_charge', sa.BigInteger(), nullable=True, server_default='0', comment='누적 충전 금액')
    )
    
    # Add inactive_days column
    op.add_column(
        'v2_user_segment',
        sa.Column('inactive_days', sa.Integer(), nullable=True, server_default='0', comment='미접속 경과일')
    )
    
    # Add is_synced_from_hq column
    op.add_column(
        'v2_user_segment',
        sa.Column('is_synced_from_hq', sa.Boolean(), nullable=False, server_default='0', comment='HQ CSV에서 동기화 여부')
    )
    
    # Add last_synced_at column
    op.add_column(
        'v2_user_segment',
        sa.Column('last_synced_at', sa.DateTime(), nullable=True, comment='마지막 HQ 동기화 시각')
    )


def downgrade() -> None:
    """Remove HQ margin fields from v2_user_segment table."""
    op.drop_column('v2_user_segment', 'last_synced_at')
    op.drop_column('v2_user_segment', 'is_synced_from_hq')
    op.drop_column('v2_user_segment', 'inactive_days')
    op.drop_column('v2_user_segment', 'total_charge')
    op.drop_column('v2_user_segment', 'total_margin')
