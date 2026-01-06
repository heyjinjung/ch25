import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings

def deploy_update_v3():
    """
    Update Roulette and Lottery configs in the existing database 
    to align with Unified Economy (Vault Point, Game XP).
    """
    settings = get_settings()
    print("=== Aligning Game Configs to Unified Economy V3 ===")
    
    # Use settings.database_url
    engine = create_engine(str(settings.database_url))
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # 1. Update Roulette Segments
        print("\n[1] Updating Roulette Segments...")
        # Get active config
        cfg_id = db.execute(text("SELECT id FROM roulette_config WHERE is_active=TRUE LIMIT 1")).scalar()
        if cfg_id:
            print(f"  Target Config ID: {cfg_id}")
            
            # Segments to Upsert/Replace
            # Using specific slot indices to overwrite existing defaults
            updates = [
                (0, "100 P", "POINT", 100, 30, False),
                (1, "200 P", "POINT", 200, 25, False),
                (2, "500 P", "POINT", 500, 15, False),
                (3, "꽝", "NONE", 0, 17, False),
                (4, "200 XP", "GAME_XP", 200, 8, True), # Formerly 1000 Coin
                (5, "잭팟 1만P", "POINT", 10000, 2, True), # Formerly Jackpot 10000
            ]
            
            for slot, label, r_type, amount, weight, jackpot in updates:
                # Update logic: update based on config_id + slot_index
                # If not exists, insert? Usually defaults exist. We update them.
                result = db.execute(text("""
                    UPDATE roulette_segment
                    SET label=:label, reward_type=:r_type, reward_amount=:amount, weight=:weight, is_jackpot=:jackpot
                    WHERE config_id=:cfg AND slot_index=:slot
                """), {
                    "label": label, "r_type": r_type, "amount": amount, "weight": weight, "jackpot": jackpot,
                    "cfg": cfg_id, "slot": slot
                })
                if result.rowcount == 0:
                    # Insert if missing (safety)
                    db.execute(text("""
                        INSERT INTO roulette_segment (config_id, slot_index, label, reward_type, reward_amount, weight, is_jackpot, created_at, updated_at)
                        VALUES (:cfg, :slot, :label, :r_type, :amount, :weight, :jackpot, NOW(), NOW())
                    """), {
                        "label": label, "r_type": r_type, "amount": amount, "weight": weight, "jackpot": jackpot,
                        "cfg": cfg_id, "slot": slot
                    })
            print("  [OK] Segments updated.")
        else:
            print("  ! No active roulette config found.")

        # 2. Update Lottery Prizes
        print("\n[2] Updating Lottery Prizes...")
        lot_id = db.execute(text("SELECT id FROM lottery_config WHERE is_active=TRUE LIMIT 1")).scalar()
        if lot_id:
             print(f"  Target Config ID: {lot_id}")
             # We can't map by 'index' easily for lottery prizes as they are ID based.
             # Lookups by ID not possible if we want generic deployment.
             # Map: (Old Amount) -> (New params)
             # IF reward_type=POINT
             mappings = {
                 50:  ("50 P", "POINT", 50),
                 200: ("200 P", "POINT", 200),
                 500: ("500 P", "POINT", 500),
                 1000: ("1,000 P", "POINT", 1000),
                 5000: ("잭팟 5,000 P", "POINT", 5000),
                 10000: ("잭팟 1만P", "POINT", 10000),
             }
             
             prizes = db.execute(text("SELECT id, reward_amount FROM lottery_prize WHERE config_id=:cid"), {"cid": lot_id}).fetchall()
             for pid, amount in prizes:
                 if amount in mappings:
                     lbl, rtype, samt = mappings[amount]
                     db.execute(text("""
                        UPDATE lottery_prize SET label=:lbl, reward_type=:rtype, reward_amount=:samt WHERE id=:pid
                     """), {"lbl": lbl, "rtype": rtype, "samt": samt, "pid": pid})
             
             # Add XP prize if not exists
             exists_xp = db.execute(text("SELECT COUNT(*) FROM lottery_prize WHERE config_id=:cid AND reward_type='GAME_XP'"), {"cid": lot_id}).scalar()
             if exists_xp == 0:
                 db.execute(text("""
                    INSERT INTO lottery_prize (config_id, label, reward_type, reward_amount, stock, weight, is_active, created_at, updated_at)
                    VALUES (:cid, '100 XP', 'GAME_XP', 100, NULL, 20, TRUE, NOW(), NOW())
                 """), {"cid": lot_id})
                 print("  [OK] Added XP prize.")
             
             print("  [OK] Prizes updated.")
        else:
            print("  ! No active lottery config found.")

        # 3. Mission Updates (Optional)
        # Update 'daily_login_gift' to have XP
        print("\n[3] Updating Mission Rewards...")
        db.execute(text("UPDATE mission SET xp_reward=20 WHERE logic_key='daily_login_gift' AND xp_reward=0"))
        print("  [OK] Mission updated.")

        db.commit()
        print("\n=== Update Complete ===")
        
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    deploy_update_v3()
