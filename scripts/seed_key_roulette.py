import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.roulette import RouletteConfig, RouletteSegment
from app.models.game_wallet import GameTokenType

def seed():
    db = SessionLocal()
    try:
        # 1. Gold Key Roulette
        gold_config = db.query(RouletteConfig).filter(RouletteConfig.ticket_type == "GOLD_KEY").first()
        if not gold_config:
            gold_config = RouletteConfig(name="Gold Roulette", ticket_type="GOLD_KEY", is_active=True, max_daily_spins=0)
            db.add(gold_config)
            db.flush()
            
            segments = [
                {"slot_index": 0, "label": "5,000 P", "reward_type": "POINT", "reward_amount": 5000, "weight": 40},
                {"slot_index": 1, "label": "10,000 P", "reward_type": "POINT", "reward_amount": 10000, "weight": 30},
                {"slot_index": 2, "label": "20,000 P", "reward_type": "POINT", "reward_amount": 20000, "weight": 15},
                {"slot_index": 3, "label": "50,000 P", "reward_type": "POINT", "reward_amount": 50000, "weight": 10},
                {"slot_index": 4, "label": "100,000 P", "reward_type": "POINT", "reward_amount": 100000, "weight": 4},
                {"slot_index": 5, "label": "DIAMOND KEY", "reward_type": "DIAMOND_KEY", "reward_amount": 1, "weight": 1},
            ]
            for seg in segments:
                db.add(RouletteSegment(config_id=gold_config.id, **seg))
            print("Seeded Gold Key Roulette")

        # 2. Diamond Key Roulette
        diamond_config = db.query(RouletteConfig).filter(RouletteConfig.ticket_type == "DIAMOND_KEY").first()
        if not diamond_config:
            diamond_config = RouletteConfig(name="Diamond Roulette", ticket_type="DIAMOND_KEY", is_active=True, max_daily_spins=0)
            db.add(diamond_config)
            db.flush()
            
            segments = [
                {"slot_index": 0, "label": "10,000 P", "reward_type": "POINT", "reward_amount": 10000, "weight": 40},
                {"slot_index": 1, "label": "20,000 P", "reward_type": "POINT", "reward_amount": 20000, "weight": 30},
                {"slot_index": 2, "label": "30,000 P", "reward_type": "POINT", "reward_amount": 30000, "weight": 15},
                {"slot_index": 3, "label": "50,000 P", "reward_type": "POINT", "reward_amount": 50000, "weight": 10},
                {"slot_index": 4, "label": "50,000 P", "reward_type": "POINT", "reward_amount": 50000, "weight": 4},
                {"slot_index": 5, "label": "100,000 P", "reward_type": "POINT", "reward_amount": 100000, "weight": 1},
            ]
            for seg in segments:
                db.add(RouletteSegment(config_id=diamond_config.id, **seg))
            print("Seeded Diamond Key Roulette")
            
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
