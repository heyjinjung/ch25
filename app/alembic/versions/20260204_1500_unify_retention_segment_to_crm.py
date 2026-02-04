"""Unify retention segment tags to CRM segment keys

Revision ID: 20260204_1500_unify_retention_segment_to_crm
Revises: 20260203_0830_add_mission_display_priority
Create Date: 2026-02-04

- HIGH_ROLLER → VIP (또는 WHALE은 추후 마진 기준으로 재분류)
- CASUAL_LOYAL → COMMON
- NEW_USER → NEW
- CHURN_RISK → AT_RISK
"""

from alembic import op
import sqlalchemy as sa

revision = "20260204_1500_unify_retention_segment_to_crm"
down_revision = "20260203_0830_add_mission_display_priority"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. 기존 데이터를 새 키로 변환 (Enum 변경 전에 String으로 임시 변환)
    op.execute("""
        ALTER TABLE v2_user_retention_state 
        MODIFY COLUMN user_segment_tag VARCHAR(50) NOT NULL DEFAULT 'COMMON'
    """)
    
    # 2. 기존 값 마이그레이션
    op.execute("""
        UPDATE v2_user_retention_state 
        SET user_segment_tag = CASE user_segment_tag
            WHEN 'HIGH_ROLLER' THEN 'VIP'
            WHEN 'CASUAL_LOYAL' THEN 'COMMON'
            WHEN 'NEW_USER' THEN 'NEW'
            WHEN 'CHURN_RISK' THEN 'AT_RISK'
            ELSE 'COMMON'
        END
    """)
    
    # 3. 기존 Enum 타입 삭제 (MySQL에서는 자동 처리됨)
    # op.execute("DROP TYPE IF EXISTS v2_retention_segment_tag")


def downgrade() -> None:
    # 역변환
    op.execute("""
        UPDATE v2_user_retention_state 
        SET user_segment_tag = CASE user_segment_tag
            WHEN 'VIP' THEN 'HIGH_ROLLER'
            WHEN 'WHALE' THEN 'HIGH_ROLLER'
            WHEN 'COMMON' THEN 'CASUAL_LOYAL'
            WHEN 'NEW' THEN 'NEW_USER'
            WHEN 'AT_RISK' THEN 'CHURN_RISK'
            WHEN 'WINNER' THEN 'CASUAL_LOYAL'
            ELSE 'NEW_USER'
        END
    """)
    
    # Enum 복원 (필요시)
    op.execute("""
        ALTER TABLE v2_user_retention_state 
        MODIFY COLUMN user_segment_tag ENUM('HIGH_ROLLER', 'CASUAL_LOYAL', 'NEW_USER', 'CHURN_RISK') 
        NOT NULL DEFAULT 'NEW_USER'
    """)
