import os
import sys
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.roulette import RouletteConfig, RouletteSegment
from app.models.game_wallet import GameTokenType

def seed_safe_roulette(db: Session, dry_run: bool = False):
    print(">>> Seeding Safe/Whale Roulette Configs...")

    # 1. Update Existing Configs to WHALE (Preserve High RTP for High Rollers)
    # Assuming the most recent active config is the 'High RTP' one.
    existing_configs = db.query(RouletteConfig).filter(
        RouletteConfig.ticket_type == "ROULETTE_COIN",
        RouletteConfig.is_active == True
    ).all()

    for config in existing_configs:
        if config.grade == "COMMON": # Default
            print(f"  - Converting Config #{config.id} '{config.name}' to WHALE grade.")
            if not dry_run:
                config.grade = "WHALE"
                config.name = f"{config.name} (WHALE)"
    
    if not dry_run:
        db.commit()

    # 2. Create NEW Config Copy (for Newbies - Marketing Hook)
    # Exactly same as WHALE but grade='NEW'
    whale_config = db.query(RouletteConfig).filter(
        RouletteConfig.ticket_type == "ROULETTE_COIN", 
        RouletteConfig.grade == "WHALE"
    ).order_by(RouletteConfig.id.desc()).first()

    if whale_config:
        print(f"  - Cloning WHALE config for NEW grade...")
        if not dry_run:
            new_config = RouletteConfig(
                name="신규 허니문 룰렛 (NEW)",
                ticket_type="ROULETTE_COIN",
                is_active=True,
                max_daily_spins=whale_config.max_daily_spins,
                grade="NEW"
            )
            db.add(new_config)
            db.flush()
            
            # Copy segments
            for seg in whale_config.segments:
                db.add(RouletteSegment(
                    config_id=new_config.id,
                    slot_index=seg.slot_index,
                    label=seg.label,
                    reward_type=seg.reward_type,
                    reward_amount=seg.reward_amount,
                    weight=seg.weight,
                    is_jackpot=seg.is_jackpot
                ))
            db.commit()

    # 3. Create COMMON Config (Safe Mode with Fragments)
    # The 'Boring' but 'Safe' version for abusers/common users.
    print(f"  - Creating COMMON (Safe Mode) Config...")
    
    # Safe Mode Segments Plan
    # Slot 1: GOLD_KEY_FRAGMENT (30%) - NEW!
    # Slot 2: 꽝 (25%)
    # Slot 3: 주사위 1개 (20%)
    # Slot 4: 금고 (20%) - 1000P? (Adjust per existing logic, likely 1000 or similar but lower weight)
    # Slot 5: 배민 5천 (3.8%) - Reduced from 6.8%
    # Slot 6: CC 코인 (1.2%)
    
    # Note: We need to match the 'slot_index' semantics if frontend relies on them, 
    # but usually backend drives content.
    
    safe_segments = [
        # Slot 1: Was 'Next Time' -> Now 'Gold Fragment'
        {"slot_index": 0, "label": "황금열쇠 조각", "reward_type": GameTokenType.GOLD_KEY_FRAGMENT.value, "reward_amount": 1, "weight": 300}, 
        
        # Slot 2: Dice
        {"slot_index": 1, "label": "주사위 1개", "reward_type": "DICE_TOKEN", "reward_amount": 1, "weight": 200},
        
        # Slot 3: Vault (Safe?) -> Let's check existing whale config for reference
        # Whale was: 100P, 200P, 500P... 
        # User request said: "Slot 3 금고 24.2%"
        {"slot_index": 2, "label": "1000 P", "reward_type": "POINT", "reward_amount": 1000, "weight": 200}, 
        
        # Slot 4: Dice
        {"slot_index": 3, "label": "주사위 1개", "reward_type": "DICE_TOKEN", "reward_amount": 1, "weight": 200},

        # Slot 5: Baemin (Reduced)
        {"slot_index": 4, "label": "배민 5천원", "reward_type": "GIFTICON_BAEMIN", "reward_amount": 5000, "weight": 38}, 

        # Slot 6: CC Coin 
        {"slot_index": 5, "label": "CC 코인", "reward_type": "CC_COIN", "reward_amount": 1, "weight": 12},
        
        # Slot 2 (Zero/Lose) - Wait, we need 6 slots.
        # User said: 
        # Slot 1: Frags (30%)
        # Slot 2: Lose (25%)  <-- Missed this in list above
        # Slot 3: Dice (20%)
        # Slot 4: Vault (20%) 
        # Slot 5: Baemin (3.8%)
        # Slot 6: CC (1.2%)
        # Sum = 100%
    ]
    
    # Re-mapping to standard 0-5
    final_segments = [
        {"slot_index": 0, "label": "황금열쇠 조각", "reward_type": GameTokenType.GOLD_KEY_FRAGMENT.value, "reward_amount": 1, "weight": 300}, 
        {"slot_index": 1, "label": "다음 기회에", "reward_type": "NONE", "reward_amount": 0, "weight": 250},
        {"slot_index": 2, "label": "주사위 1개", "reward_type": "DICE_TOKEN", "reward_amount": 1, "weight": 200},
        {"slot_index": 3, "label": "1,000 P", "reward_type": "POINT", "reward_amount": 1000, "weight": 200},
        {"slot_index": 4, "label": "배민 5천원", "reward_type": "GIFTICON_BAEMIN", "reward_amount": 5000, "weight": 38},
        {"slot_index": 5, "label": "CC 코인", "reward_type": "CC_COIN", "reward_amount": 1, "weight": 12},
    ]

    if not dry_run:
        common_config = RouletteConfig(
            name="일반 방어 룰렛 (COMMON)",
            ticket_type="ROULETTE_COIN",
            is_active=True,
            max_daily_spins=0,
            grade="COMMON"
        )
        db.add(common_config)
        db.flush()
        
        for seg in final_segments:
            db.add(RouletteSegment(config_id=common_config.id, **seg))
        db.commit()
        print("  - Created COMMON config successfully.")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_safe_roulette(db)
    finally:
        db.close()
