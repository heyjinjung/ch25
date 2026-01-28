import sys
import os

# Add project root to sys.path
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.v2.models.v2_roulette import V2RouletteConfig, V2RouletteSegment

def seed_roulette_configs(db: Session):
    configs = [
        {
            "ticket_type": "ROULETTE_TICKET",
            "name": "Standard Roulette",
            "segments": [
                {"slot_index": 0, "label": "잭팟!", "reward_type": "VAULT", "reward_amount": 10000, "weight": 1, "is_jackpot": True},
                {"slot_index": 1, "label": "100 포인트", "reward_type": "VAULT", "reward_amount": 100, "weight": 10, "is_jackpot": False},
                {"slot_index": 2, "label": "티켓 1장", "reward_type": "ROULETTE_TICKET", "reward_amount": 1, "weight": 5, "is_jackpot": False},
                {"slot_index": 3, "label": "꽝", "reward_type": "NONE", "reward_amount": 0, "weight": 20, "is_jackpot": False},
                {"slot_index": 4, "label": "500 포인트", "reward_type": "VAULT", "reward_amount": 500, "weight": 5, "is_jackpot": False},
                {"slot_index": 5, "label": "꽝", "reward_type": "NONE", "reward_amount": 0, "weight": 20, "is_jackpot": False},
                {"slot_index": 6, "label": "50 포인트", "reward_type": "VAULT", "reward_amount": 50, "weight": 20, "is_jackpot": False},
                {"slot_index": 7, "label": "티켓 1장", "reward_type": "ROULETTE_TICKET", "reward_amount": 1, "weight": 5, "is_jackpot": False},
            ]
        },
        {
            "ticket_type": "GOLD_KEY_TICKET",
            "name": "Gold Key Roulette",
            "segments": [
                {"slot_index": 0, "label": "황금 잭팟!", "reward_type": "VAULT", "reward_amount": 50000, "weight": 1, "is_jackpot": True},
                {"slot_index": 1, "label": "5000 포인트", "reward_type": "VAULT", "reward_amount": 5000, "weight": 10, "is_jackpot": False},
                {"slot_index": 2, "label": "황금 열쇠", "reward_type": "GOLD_KEY_TICKET", "reward_amount": 1, "weight": 5, "is_jackpot": False},
                {"slot_index": 3, "label": "1000 포인트", "reward_type": "VAULT", "reward_amount": 1000, "weight": 20, "is_jackpot": False},
                {"slot_index": 4, "label": "다이아 조각", "reward_type": "DIAMOND_FRAGMENT", "reward_amount": 1, "weight": 5, "is_jackpot": False},
                {"slot_index": 5, "label": "꽝", "reward_type": "NONE", "reward_amount": 0, "weight": 10, "is_jackpot": False},
                {"slot_index": 6, "label": "2000 포인트", "reward_type": "VAULT", "reward_amount": 2000, "weight": 10, "is_jackpot": False},
                {"slot_index": 7, "label": "재도전", "reward_type": "GOLD_KEY_TICKET", "reward_amount": 1, "weight": 5, "is_jackpot": False},
            ]
        },
        {
            "ticket_type": "DIAMOND_TICKET",
            "name": "Diamond Roulette",
            "segments": [
                {"slot_index": 0, "label": "다이아 잭팟!", "reward_type": "DIAMOND", "reward_amount": 10, "weight": 1, "is_jackpot": True},
                {"slot_index": 1, "label": "다이아 1개", "reward_type": "DIAMOND", "reward_amount": 1, "weight": 20, "is_jackpot": False},
                {"slot_index": 2, "label": "1만 포인트", "reward_type": "VAULT", "reward_amount": 10000, "weight": 10, "is_jackpot": False},
                {"slot_index": 3, "label": "꽝", "reward_type": "NONE", "reward_amount": 0, "weight": 5, "is_jackpot": False},
                {"slot_index": 4, "label": "5000 포인트", "reward_type": "VAULT", "reward_amount": 5000, "weight": 20, "is_jackpot": False},
                {"slot_index": 5, "label": "황금 열쇠", "reward_type": "GOLD_KEY_TICKET", "reward_amount": 1, "weight": 10, "is_jackpot": False},
                {"slot_index": 6, "label": "다이아 3개", "reward_type": "DIAMOND", "reward_amount": 3, "weight": 5, "is_jackpot": False},
                {"slot_index": 7, "label": "재도전", "reward_type": "DIAMOND_TICKET", "reward_amount": 1, "weight": 5, "is_jackpot": False},
            ]
        },
        {
            "ticket_type": "TRIAL_TICKET",
            "name": "Trial Roulette",
            "segments": [
                {"slot_index": 0, "label": "데모 잭팟", "reward_type": "NONE", "reward_amount": 0, "weight": 1, "is_jackpot": True},
                {"slot_index": 1, "label": "재미 획득", "reward_type": "NONE", "reward_amount": 0, "weight": 20, "is_jackpot": False},
                {"slot_index": 2, "label": "다시 시도", "reward_type": "TRIAL_TICKET", "reward_amount": 1, "weight": 20, "is_jackpot": False},
                {"slot_index": 3, "label": "꽝", "reward_type": "NONE", "reward_amount": 0, "weight": 20, "is_jackpot": False},
                {"slot_index": 4, "label": "대박 재미", "reward_type": "NONE", "reward_amount": 0, "weight": 5, "is_jackpot": False},
                {"slot_index": 5, "label": "꽝", "reward_type": "NONE", "reward_amount": 0, "weight": 20, "is_jackpot": False},
                {"slot_index": 6, "label": "승리", "reward_type": "NONE", "reward_amount": 0, "weight": 20, "is_jackpot": False},
                {"slot_index": 7, "label": "보너스 데모", "reward_type": "TRIAL_TICKET", "reward_amount": 2, "weight": 5, "is_jackpot": False},
            ]
        },
    ]

    for config_data in configs:
        ticket_type = config_data["ticket_type"]
        existing = db.query(V2RouletteConfig).filter(
            V2RouletteConfig.ticket_type == ticket_type,
            V2RouletteConfig.is_active == True
        ).first()

        if existing:
            print(f"Config for {ticket_type} already exists. Updating segments...")
            config = existing
            # Clear existing segments
            db.query(V2RouletteSegment).filter(V2RouletteSegment.config_id == config.id).delete()
            db.flush()
        else:
            print(f"Creating config for {ticket_type}...")
            config = V2RouletteConfig(
                name=config_data["name"],
                ticket_type=ticket_type,
                is_active=True,
                # Using deprecated grade 'COMMON' as required by schema defaults
                grade="COMMON",
                max_daily_spins=0
            )
            db.add(config)
            db.flush()

        for seg_data in config_data["segments"]:
            seg = V2RouletteSegment(
                config_id=config.id,
                slot_index=seg_data["slot_index"],
                label=seg_data["label"],
                reward_type=seg_data["reward_type"],
                reward_amount=seg_data["reward_amount"],
                weight=seg_data["weight"],
                is_jackpot=seg_data["is_jackpot"]
            )
            db.add(seg)
        
        db.commit()
        print(f"Updated {ticket_type} config with {len(config_data['segments'])} segments.")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_roulette_configs(db)
    finally:
        db.close()
