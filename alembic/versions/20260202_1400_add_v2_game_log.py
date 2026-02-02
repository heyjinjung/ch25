"""Add v2_game_log table for CSV import analytics

Revision ID: 20260202_1400_add_v2_game_log
Revises: aad439cb38d2
Create Date: 2026-02-02 14:00:00+09:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '20260202_1400_add_v2_game_log'
down_revision = 'aad439cb38d2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create v2_game_log table for external game log CSV imports."""
    op.create_table(
        'v2_game_log',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False, comment='V2 유저 ID'),
        sa.Column('game_type', sa.String(length=32), nullable=False, comment='게임 종류 (DICE, ROULETTE, SLOT, POKER 등)'),
        sa.Column('result', sa.String(length=16), nullable=False, comment='게임 결과 (WIN, LOSE, DRAW, JACKPOT)'),
        sa.Column('bet_amount', sa.BigInteger(), nullable=False, server_default='0', comment='배팅 금액 (원)'),
        sa.Column('payout_amount', sa.BigInteger(), nullable=False, server_default='0', comment='지급 금액 (원)'),
        sa.Column('balance_after', sa.BigInteger(), nullable=False, server_default='0', comment='게임 후 잔액 (원)'),
        sa.Column('external_user_id', sa.String(length=128), nullable=True, comment='외부 시스템 유저 ID'),
        sa.Column('session_id', sa.String(length=128), nullable=True, comment='게임 세션 ID'),
        sa.Column('game_metadata', mysql.JSON(), nullable=True, comment='게임별 추가 정보 (JSON)'),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False, comment='CSV의 기록 일시 (원본 데이터)'),
        sa.Column('imported_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP'), comment='시스템 반입 시각'),
        sa.Column('import_job_id', sa.String(length=64), nullable=True, comment='CSV Import Job ID'),
        sa.ForeignKeyConstraint(['user_id'], ['v2_user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        comment='V2 외부 게임 로그 테이블'
    )
    
    # Create indexes for efficient queries
    op.create_index('ix_v2_game_log_user_id', 'v2_game_log', ['user_id'], unique=False)
    op.create_index('ix_v2_game_log_user_recorded', 'v2_game_log', ['user_id', 'recorded_at'], unique=False)
    op.create_index('ix_v2_game_log_recorded_at', 'v2_game_log', ['recorded_at'], unique=False)
    op.create_index('ix_v2_game_log_result_recorded', 'v2_game_log', ['result', 'recorded_at'], unique=False)
    op.create_index('ix_v2_game_log_game_type', 'v2_game_log', ['game_type'], unique=False)
    op.create_index('ix_v2_game_log_session_id', 'v2_game_log', ['session_id'], unique=False)
    op.create_index('ix_v2_game_log_import_job_id', 'v2_game_log', ['import_job_id'], unique=False)


def downgrade() -> None:
    """Drop v2_game_log table."""
    op.drop_index('ix_v2_game_log_import_job_id', table_name='v2_game_log')
    op.drop_index('ix_v2_game_log_session_id', table_name='v2_game_log')
    op.drop_index('ix_v2_game_log_game_type', table_name='v2_game_log')
    op.drop_index('ix_v2_game_log_result_recorded', table_name='v2_game_log')
    op.drop_index('ix_v2_game_log_recorded_at', table_name='v2_game_log')
    op.drop_index('ix_v2_game_log_user_recorded', table_name='v2_game_log')
    op.drop_index('ix_v2_game_log_user_id', table_name='v2_game_log')
    op.drop_table('v2_game_log')
