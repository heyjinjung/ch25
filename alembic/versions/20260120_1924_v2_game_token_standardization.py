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
revision = '20260120_1924_v2_game_token_standardization'
down_revision = '20260120_1410_add_dice_config_probability_columns'
branch_labels = None
depends_on = None


def upgrade():
    """V1 → V2 명칭으로 변환"""
    
    connection = op.get_bind()
    
    # 0. Enum 컬럼 확장 (V1 + V2 모든 값 포함)
    # 기존 값들과 새로운 값들을 모두 포함하도록 ENUM 변경
    # 주의: MySQL에서는 ENUM 변경 시 전체 테이블 재구성이 발생할 수 있음
    all_enums = [
        # V1 (Legacy)
        'ROULETTE_COIN', 'DICE_TOKEN', 'TRIAL_TOKEN', 'LOTTERY_TICKET',
        'GOLD_KEY', 'DIAMOND_KEY', 'GOLD_KEY_FRAGMENT', 'DIAMOND_KEY_FRAGMENT',
        'PUZZLE_C', 'PUZZLE_C1', 'PUZZLE_C2', 'PUZZLE_J', 'PUZZLE_M',
        'DIAMOND', 'VAULT', 'NONE',
        # V2 (New)
        'ROULETTE_TICKET', 'DICE_TICKET', 'GOLD_KEY_TICKET', 
        'DIAMOND_TICKET', 'DIAMOND_FRAGMENT'
    ]
    
    enum_str = ", ".join([f"'{e}'" for e in all_enums])
    
    connection.execute(
        text(f"ALTER TABLE user_game_wallet MODIFY COLUMN token_type ENUM({enum_str}) NOT NULL")
    )
    
    # 1. 데이터 변환 (V1 → V2)
    mappings = [
        ('ROULETTE_COIN', 'ROULETTE_TICKET'),
        ('DICE_TOKEN', 'DICE_TICKET'),
        ('GOLD_KEY', 'GOLD_KEY_TICKET'),
        ('DIAMOND_KEY', 'DIAMOND_TICKET'),
        ('DIAMOND_KEY_FRAGMENT', 'DIAMOND_FRAGMENT'),
    ]
    
    for old_value, new_value in mappings:
        connection.execute(
            text("""
                UPDATE user_game_wallet 
                SET token_type = :new_value 
                WHERE token_type = :old_value
            """),
            {"old_value": old_value, "new_value": new_value}
        )
    
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
