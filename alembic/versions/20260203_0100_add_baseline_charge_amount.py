"""add baseline_charge_amount to v2_user

Revision ID: 20260203_0100_add_baseline_charge_amount
Revises: 20260203_1000_add_v2_external_deposit_unmatched
Create Date: 2026-02-03 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260203_0100_add_baseline_charge_amount'
down_revision = '20260203_1000_add_v2_external_deposit_unmatched'
branch_labels = None
depends_on = None


def upgrade():
    """V2User에 baseline_charge_amount 컬럼 추가.
    
    목적: CSV Import 시 V2 가입 이후 충전액만 계산하기 위한 기준점.
    - 최초 Import 시: baseline = CSV 누적액 (기존 충전은 무시)
    - 이후 Import 시: 유효 충전액 = CSV 누적액 - baseline
    """
    op.add_column(
        'v2_user',
        sa.Column('baseline_charge_amount', sa.Integer(), nullable=False, server_default='0')
    )
    
    # 기존 유저들: baseline = 현재 total_charge_amount로 설정 (이미 반영된 금액)
    op.execute("""
        UPDATE v2_user 
        SET baseline_charge_amount = total_charge_amount 
        WHERE total_charge_amount > 0
    """)


def downgrade():
    op.drop_column('v2_user', 'baseline_charge_amount')
