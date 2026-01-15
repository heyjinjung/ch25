import sys
import os
from sqlalchemy import select, text

# Add app to path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.roulette import RouletteSegment, RouletteConfig
from app.models.lottery import LotteryPrize, LotteryConfig
from app.services.dice_service import DiceService
from app.services.roulette_service import RouletteService
from app.services.lottery_service import LotteryService

def diagnose_xp():
    db = SessionLocal()
    try:
        print("=== DIAGNOSING XP SOURCES ===")

        # 1. DICE
        print("\n[DICE]")
        print(f"File: app/services/dice_service.py")
        print(f"DiceService.BASE_GAME_XP (Hardcoded): {DiceService.BASE_GAME_XP}")
        print(f"DiceService.WIN_GAME_XP (Hardcoded): {DiceService.WIN_GAME_XP}")
        
        # 2. ROULETTE
        print("\n[ROULETTE]")
        print(f"File: app/services/roulette_service.py")
        print(f"RouletteService.BASE_GAME_XP (Hardcoded): {RouletteService.BASE_GAME_XP}")
        
        configs = db.execute(select(RouletteConfig).where(RouletteConfig.is_active.is_(True))).scalars().all()
        if not configs:
            print("No active RouletteConfig found.")
        else:
            for conf in configs:
                print(f"Active Config ID: {conf.id} ({conf.name})")
                segments = db.execute(select(RouletteSegment).where(RouletteSegment.config_id == conf.id)).scalars().all()
                xp_segments = [s for s in segments if s.reward_type == "GAME_XP"]
                if xp_segments:
                    print(f"  WARNING: Found {len(xp_segments)} segments rewarding XP:")
                    for s in xp_segments:
                        print(f"    - Segment '{s.label}': {s.reward_amount} XP (Weight: {s.weight})")
                else:
                    print("  No XP segments found.")

        # 3. LOTTERY
        print("\n[LOTTERY]")
        print(f"File: app/services/lottery_service.py")
        print(f"LotteryService.BASE_GAME_XP (Hardcoded): {LotteryService.BASE_GAME_XP}")

        lottery_configs = db.execute(select(LotteryConfig).where(LotteryConfig.is_active.is_(True))).scalars().all()
        if not lottery_configs:
            print("No active LotteryConfig found.")
        else:
            for conf in lottery_configs:
                print(f"Active Config ID: {conf.id} ({conf.name})")
                prizes = db.execute(select(LotteryPrize).where(LotteryPrize.config_id == conf.id)).scalars().all()
                xp_prizes = [p for p in prizes if p.reward_type == "GAME_XP"]
                if xp_prizes:
                    print(f"  WARNING: Found {len(xp_prizes)} prizes rewarding XP:")
                    for p in xp_prizes:
                        print(f"    - Prize '{p.name}': {p.reward_amount} XP")
                else:
                    print("  No XP prizes found.")
        
        # 4. Global Settings (AppUIConfig)
        print("\n[GLOBAL SETTINGS]")
        results = db.execute(text("SELECT `key`, value_json FROM app_ui_config")).all()
        for row in results:
             print(f"Key: {row[0]}, Value: {row[1]}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    diagnose_xp()
