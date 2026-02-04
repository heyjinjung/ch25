"""Add CHECK constraint to v2_user_segment.segment column

Revision ID: 20260204_0200_add_segment_check_constraint
Revises: 20260204_0100_add_hq_daily_deposit_log
Create Date: 2026-02-04 02:00:00+09:00

SoT 근거: docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/20260204_segment_mapping_audit.md
- 문제점: segment 컬럼에 CHECK 제약조건 없음 → 임의의 문자열 저장 가능
- 해결: DB 레벨 무결성 검증을 위한 CHECK 제약조건 추가
"""
from alembic import op
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '20260204_0200_add_segment_check_constraint'
down_revision = '20260204_0100_add_hq_daily_deposit_log'
branch_labels = None
depends_on = None

# CRM 세그먼트 키 (SoT 정의)
ALLOWED_SEGMENTS = ('NEW', 'COMMON', 'VIP', 'WHALE', 'AT_RISK', 'WINNER')


def _constraint_exists(table_name: str, constraint_name: str) -> bool:
    """Check if constraint exists on table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    try:
        constraints = inspector.get_check_constraints(table_name)
        return any(c['name'] == constraint_name for c in constraints)
    except Exception:
        return False


def upgrade() -> None:
    """Add CHECK constraint to segment column in v2_user_segment table."""
    
    # v2_user_segment.segment CHECK 제약조건 추가 (이미 존재하면 건너뛰기)
    if not _constraint_exists('v2_user_segment', 'ck_v2_user_segment_segment'):
        op.create_check_constraint(
            constraint_name='ck_v2_user_segment_segment',
            table_name='v2_user_segment',
            condition=f"segment IN {ALLOWED_SEGMENTS}"
        )
    else:
        print("[MIGRATION] ck_v2_user_segment_segment constraint already exists, skipping")
    
    # hq_prospective_user.segment CHECK 제약조건 추가 (이미 존재하면 건너뛰기)
    if not _constraint_exists('hq_prospective_user', 'ck_hq_prospective_user_segment'):
        op.create_check_constraint(
            constraint_name='ck_hq_prospective_user_segment',
            table_name='hq_prospective_user',
            condition=f"segment IN {ALLOWED_SEGMENTS}"
        )
    else:
        print("[MIGRATION] ck_hq_prospective_user_segment constraint already exists, skipping")


def downgrade() -> None:
    """Remove CHECK constraints from segment columns."""
    op.drop_constraint('ck_hq_prospective_user_segment', 'hq_prospective_user', type_='check')
    op.drop_constraint('ck_v2_user_segment_segment', 'v2_user_segment', type_='check')
