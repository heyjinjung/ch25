"""Migrate GameTokenType from V1 to V2 naming

Revision ID: v2_game_token_standardization
Revises: 
Create Date: 2026-01-20 19:15:00

Migration Strategy:
- V1 to V2 Naming Conversion
- ROULETTE_COIN -> ROULETTE_TICKET
- DICE_TOKEN -> DICE_TICKET  
- GOLD_KEY -> GOLD_KEY_TICKET
- DIAMOND_KEY -> DIAMOND_TICKET
- DIAMOND_KEY_FRAGMENT -> DIAMOND_FRAGMENT
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
    # 0. Extend Enum column
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
    
    op.execute(
        text(f"ALTER TABLE user_game_wallet MODIFY COLUMN token_type ENUM({enum_str}) NOT NULL")
    )
    
    # 1. Data Conversion (V1 -> V2)
    mappings = [
        ('ROULETTE_COIN', 'ROULETTE_TICKET'),
        ('DICE_TOKEN', 'DICE_TICKET'),
        ('GOLD_KEY', 'GOLD_KEY_TICKET'),
        ('DIAMOND_KEY', 'DIAMOND_TICKET'),
        ('DIAMOND_KEY_FRAGMENT', 'DIAMOND_FRAGMENT'),
    ]
    
    for old_value, new_value in mappings:
        op.execute(
            text("""
                UPDATE user_game_wallet 
                SET token_type = :new_value 
                WHERE token_type = :old_value
            """).bindparams(old_value=old_value, new_value=new_value)
        )
    
    print(f"V1 -> V2 GameTokenType migration completed")


def downgrade():
    # Reverse Mappings (V2 -> V1)
    reverse_mappings = [
        ('ROULETTE_TICKET', 'ROULETTE_COIN'),
        ('DICE_TICKET', 'DICE_TOKEN'),
        ('GOLD_KEY_TICKET', 'GOLD_KEY'),
        ('DIAMOND_TICKET', 'DIAMOND_KEY'),
        ('DIAMOND_FRAGMENT', 'DIAMOND_KEY_FRAGMENT'),
    ]
    
    for new_value, old_value in reverse_mappings:
        op.execute(
            text("""
                UPDATE user_game_wallet 
                SET token_type = :old_value 
                WHERE token_type = :new_value
            """).bindparams(old_value=old_value, new_value=new_value)
        )
    
    print(f"V2 -> V1 GameTokenType rollback completed")
