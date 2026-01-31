"""Add golden_hour_start_time, golden_hour_end_time columns to v2_dice_config.

Revision ID: 20260131_1600_add_dice_golden_hour_time_columns
Revises: 20260131_1500_add_v2_user_fk_to_log_tables
Create Date: 2026-01-31 16:00:00.000000

Note: 어드민에서 골든아워 시작/종료 시간을 설정할 수 있도록 컬럼 추가
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260131_1600_add_dice_golden_hour_time_columns'
down_revision = '20260131_1500_add_v2_user_fk_to_log_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add golden_hour_start_time column (HH:MM:SS format, KST)
    op.add_column(
        'v2_dice_config',
        sa.Column('golden_hour_start_time', sa.String(8), nullable=False, server_default='21:30:00')
    )
    
    # Add golden_hour_end_time column (HH:MM:SS format, KST)
    op.add_column(
        'v2_dice_config',
        sa.Column('golden_hour_end_time', sa.String(8), nullable=False, server_default='22:30:00')
    )


def downgrade() -> None:
    op.drop_column('v2_dice_config', 'golden_hour_end_time')
    op.drop_column('v2_dice_config', 'golden_hour_start_time')
