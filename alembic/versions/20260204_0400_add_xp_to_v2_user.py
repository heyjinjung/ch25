"""Add xp column to v2_user for SoT consolidation.

Revision ID: 20260204_0400_add_xp_to_v2_user
Revises: 20260204_0300_add_pending_segment
Create Date: 2026-02-04

V2 SoT 통합:
- user_level_progress.xp → v2_user.xp 이관
- v2_user가 레벨/XP의 단일 SoT가 됨
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260204_0400_add_xp_to_v2_user"
down_revision = "20260204_0300_add_pending_segment"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. v2_user에 xp 컬럼 추가
    op.add_column(
        "v2_user",
        sa.Column("xp", sa.Integer(), nullable=False, server_default="0"),
    )
    
    # 2. user_level_progress에서 기존 데이터 마이그레이션
    op.execute("""
        UPDATE v2_user u
        INNER JOIN user_level_progress p ON u.id = p.user_id
        SET u.xp = COALESCE(p.xp, 0),
            u.level = COALESCE(p.level, 1)
    """)
    
    # 3. external_ranking_data에서 입금 데이터 마이그레이션 (이미 total_charge_amount 있음)
    op.execute("""
        UPDATE v2_user u
        INNER JOIN external_ranking_data e ON u.id = e.user_id
        SET u.total_charge_amount = COALESCE(e.deposit_amount, 0)
    """)


def downgrade() -> None:
    # xp 컬럼 제거
    op.drop_column("v2_user", "xp")
