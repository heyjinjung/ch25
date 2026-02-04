"""Add hq_daily_deposit_log table for HQ Daily deposit deduplication

Revision ID: 20260204_0100_add_hq_daily_deposit_log
Revises: 20260203_1000_add_v2_external_deposit_unmatched
Create Date: 2026-02-04 01:00:00+09:00

중복 입금 방지를 위한 처리 로그 테이블.
(닉네임, 금액, 입금시각) 조합으로 중복 체크.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '20260204_0100_add_hq_daily_deposit_log'
down_revision = '20260203_1000_add_v2_external_deposit_unmatched'
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    """Check if table exists in database."""
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def _index_exists(table_name: str, index_name: str) -> bool:
    """Check if index exists on table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    indexes = inspector.get_indexes(table_name)
    return any(idx['name'] == index_name for idx in indexes)


def upgrade() -> None:
    """Create hq_daily_deposit_log table for HQ Daily CSV import deduplication."""
    # 테이블이 이미 존재하면 건너뛰기
    if _table_exists('hq_daily_deposit_log'):
        print("[MIGRATION] hq_daily_deposit_log table already exists, skipping create_table")
    else:
        op.create_table(
            'hq_daily_deposit_log',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            # 중복 방지 키 (닉네임+금액+시각 해시)
            sa.Column('dedup_key', sa.String(32), unique=True, nullable=False),
            # 원본 데이터 (디버깅/조회용)
            sa.Column('nickname', sa.String(100), nullable=False),
            sa.Column('amount', sa.Integer(), nullable=False),
            sa.Column('deposit_at', sa.DateTime(), nullable=True),  # CSV의 충전 시각
            # 매칭 결과
            sa.Column('user_id', sa.Integer(), nullable=True),  # 매칭된 V2User.id
            sa.Column('status', sa.String(20), nullable=False),  # MATCHED, NOT_FOUND, AMBIGUOUS
            # 메타
            sa.Column('import_batch_id', sa.String(50), nullable=True),  # 같은 배치 구분
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
    
    # 인덱스 생성 (이미 존재하면 건너뛰기)
    if not _index_exists('hq_daily_deposit_log', 'ix_hq_daily_deposit_log_nickname'):
        op.create_index('ix_hq_daily_deposit_log_nickname', 'hq_daily_deposit_log', ['nickname'])
    if not _index_exists('hq_daily_deposit_log', 'ix_hq_daily_deposit_log_user_id'):
        op.create_index('ix_hq_daily_deposit_log_user_id', 'hq_daily_deposit_log', ['user_id'])
    if not _index_exists('hq_daily_deposit_log', 'ix_hq_daily_deposit_log_deposit_at'):
        op.create_index('ix_hq_daily_deposit_log_deposit_at', 'hq_daily_deposit_log', ['deposit_at'])
    if not _index_exists('hq_daily_deposit_log', 'ix_hq_daily_deposit_log_dedup_key'):
        op.create_index('ix_hq_daily_deposit_log_dedup_key', 'hq_daily_deposit_log', ['dedup_key'])


def downgrade() -> None:
    """Drop hq_daily_deposit_log table."""
    op.drop_index('ix_hq_daily_deposit_log_dedup_key', table_name='hq_daily_deposit_log')
    op.drop_index('ix_hq_daily_deposit_log_deposit_at', table_name='hq_daily_deposit_log')
    op.drop_index('ix_hq_daily_deposit_log_user_id', table_name='hq_daily_deposit_log')
    op.drop_index('ix_hq_daily_deposit_log_nickname', table_name='hq_daily_deposit_log')
    op.drop_table('hq_daily_deposit_log')
