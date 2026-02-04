"""Add pending_segment column to v2_user_segment for NEW protection period

Revision ID: 20260204_0300_add_pending_segment
Revises: 20260204_0200_add_segment_check_constraint
Create Date: 2026-02-04 03:00:00+09:00

신규 유저 정책:
- 가입 후 7일간은 NEW 세그먼트 강제 유지 (신규 유저 미션 진행을 위해)
- 7일 후 오전 9시(KST) 이후에 pending_segment로 자동 전환
- pending_segment: HQ에서 가져온 원래 세그먼트 (VIP, WHALE 등)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '20260204_0300_add_pending_segment'
down_revision = '20260204_0200_add_segment_check_constraint'
branch_labels = None
depends_on = None


def _column_exists(table_name: str, column_name: str) -> bool:
    """Check if column exists in table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    """Add pending_segment column to v2_user_segment table."""
    # pending_segment 컬럼 추가 (이미 존재하면 건너뛰기)
    if not _column_exists('v2_user_segment', 'pending_segment'):
        op.add_column(
            'v2_user_segment',
            sa.Column('pending_segment', sa.String(50), nullable=True, 
                     comment='7일 후 적용할 세그먼트 (NEW 보호 기간용)')
        )
    else:
        print("[MIGRATION] pending_segment column already exists, skipping")


def downgrade() -> None:
    """Remove pending_segment column from v2_user_segment table."""
    if _column_exists('v2_user_segment', 'pending_segment'):
        op.drop_column('v2_user_segment', 'pending_segment')
