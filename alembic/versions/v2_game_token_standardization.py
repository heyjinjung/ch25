"""Migrate GameTokenType from V1 to V2 naming

Revision ID: v2_game_token_standardization
Revises: 
Create Date: 2026-01-20 19:15:00

Migration Strategy:
- V1 → V2 명칭 변환
- ROULETTE_COIN → ROULETTE_TICKET
- DICE_TOKEN → DICE_TICKET  
- GOLD_KEY → GOLD_KEY_TICKET
- DIAMOND_KEY → DIAMOND_TICKET
- DIAMOND_KEY_FRAGMENT → DIAMOND_FRAGMENT

Reference: docs/v2_specs/01_core/v2_item_inventory_sot_ko.md
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision = 'v2_game_token_standardization'
down_revision = None  # TODO: 이전 마이그레이션 ID로 변경
branch_labels = None
depends_on = None


def upgrade():
    """V1 → V2 명칭으로 변환"""
    
    # user_game_wallet 테이블의 token_type 컬럼 값 변경
    connection = op.get_bind()
    
    # 변환 매핑 (V1 → V2)
    mappings = [
        ('ROULETTE_COIN', 'ROULETTE_TICKET'),
        ('DICE_TOKEN', 'DICE_TICKET'),
        ('GOLD_KEY', 'GOLD_KEY_TICKET'),
        ('DIAMOND_KEY', 'DIAMOND_TICKET'),
        ('DIAMOND_KEY_FRAGMENT', 'DIAMOND_FRAGMENT'),
    ]
    
    for old_value, new_value in mappings:
        # 1. user_game_wallet 테이블
        connection.execute(
            text("""
                UPDATE user_game_wallet 
                SET token_type = :new_value 
                WHERE token_type = :old_value
            """),
            {"old_value": old_value, "new_value": new_value}
        )
        
        # 2. 다른 테이블들도 필요시 추가 (예: 로그 테이블 등)
        # 주의: reward_type 등 문자열 필드도 확인 필요
    
    print(f"✅ V1 → V2 GameTokenType migration completed")
    print(f"   Converted mappings: {len(mappings)}")


def downgrade():
    """V2 → V1 명칭으로 롤백"""
    
    connection = op.get_bind()
    
    # 역변환 매핑 (V2 → V1)
    reverse_mappings = [
        ('ROULETTE_TICKET', 'ROULETTE_COIN'),
        ('DICE_TICKET', 'DICE_TOKEN'),
        ('GOLD_KEY_TICKET', 'GOLD_KEY'),
        ('DIAMOND_TICKET', 'DIAMOND_KEY'),
        ('DIAMOND_FRAGMENT', 'DIAMOND_KEY_FRAGMENT'),
    ]
    
    for new_value, old_value in reverse_mappings:
        # 1. user_game_wallet 테이블
        connection.execute(
            text("""
                UPDATE user_game_wallet 
                SET token_type = :old_value 
                WHERE token_type = :new_value
            """),
            {"old_value": old_value, "new_value": new_value}
        )
    
    print(f"⬅️  V2 → V1 GameTokenType rollback completed")
