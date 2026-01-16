import sys
import os

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.lottery import LotteryConfig, LotteryPrize
from app.models.game_wallet import GameTokenType

def seed_lottery_puzzles():
    db = SessionLocal()
    try:
        # 1. Get Active Config
        config = db.query(LotteryConfig).filter(LotteryConfig.is_active == True).first()
        if not config:
            print("[ERROR] No active lottery config found.")
            return

        print(f"[INFO] Updating Config: {config.name} (ID: {config.id})")

        # 2. Define New Prizes
        new_prizes = [
            {"label": "퍼즐 조각 C", "reward_type": GameTokenType.PUZZLE_C.value, "reward_amount": 1, "weight": 10},
            {"label": "퍼즐 조각 J", "reward_type": GameTokenType.PUZZLE_J.value, "reward_amount": 1, "weight": 5},
            {"label": "퍼즐 조각 M", "reward_type": GameTokenType.PUZZLE_M.value, "reward_amount": 1, "weight": 5},
        ]

        total_new_weight = sum(p["weight"] for p in new_prizes)

        # 3. Add Prizes (Idempotent check)
        for p_data in new_prizes:
            existing = db.query(LotteryPrize).filter(
                LotteryPrize.config_id == config.id,
                LotteryPrize.reward_type == p_data["reward_type"]
            ).first()

            if existing:
                print(f"[SKIP] {p_data['label']} already exists.")
            else:
                new_prize = LotteryPrize(
                    config_id=config.id,
                    label=p_data["label"],
                    reward_type=p_data["reward_type"],
                    reward_amount=p_data["reward_amount"],
                    weight=p_data["weight"],
                    is_active=True
                )
                db.add(new_prize)
                print(f"[ADD] Added {p_data['label']} (Weight: {p_data['weight']})")

        # 4. Adjust Low-Tier Prize Weight (Reduce by total_new_weight to keep balance)
        # Find 50P prize (lowest tier) to soak the weight reduction
        low_tier_prizes = db.query(LotteryPrize).filter(
            LotteryPrize.config_id == config.id,
            LotteryPrize.reward_amount <= 200, # Reduce probability of low tiers
            LotteryPrize.reward_type == "POINT"
        ).all()
        
        # Sort by weight descending to reduce from the most frequent
        low_tier_prizes.sort(key=lambda x: x.weight, reverse=True)

        remaining_deduction = total_new_weight
        
        for prize in low_tier_prizes:
            if remaining_deduction <= 0:
                break
                
            deduct = min(prize.weight - 1, remaining_deduction) # Keep at least weight 1
            if deduct > 0:
                prize.weight -= deduct
                remaining_deduction -= deduct
                print(f"[UPDATE] Reduced {prize.label} Weight: {prize.weight + deduct} -> {prize.weight}")
                db.add(prize)
        
        if remaining_deduction > 0:
             print(f"[WARN] Could not fully deduct {total_new_weight} weight. Remaining excess: {remaining_deduction}")


        db.commit()
        print("[SUCCESS] Lottery Puzzle Seeding Completed.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_lottery_puzzles()
