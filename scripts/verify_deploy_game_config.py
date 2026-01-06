import sys
import os
import subprocess
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# DB Connection for Local Verification
DB_URL = "mysql+pymysql://xmasuser:2026@127.0.0.1:3307/xmas_event"

def setup_legacy_config():
    """Seed legacy config (Roulette with 'Coin', Lottery with 'Gift') for testing update."""
    engine = create_engine(DB_URL)
    db = sessionmaker(bind=engine)()
    try:
        print("[Setup] Seeding Legacy V2 Configs...")
        
        # Deactivate existing active configs to ensure deploy script picks our test config
        db.execute(text("UPDATE roulette_config SET is_active=0 WHERE is_active=1"))
        db.execute(text("UPDATE lottery_config SET is_active=0 WHERE is_active=1"))
        db.commit()
        
        # 1. Roulette: Active Config with 'Coin' segments
        db.execute(text("INSERT INTO roulette_config (name, is_active, max_daily_spins, created_at, updated_at) VALUES ('Legacy Roulette', 1, 0, NOW(), NOW())"))
        r_cfg_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        
        # Segments: 100 Coin (Old)
        db.execute(text(f"""
            INSERT INTO roulette_segment (config_id, slot_index, label, reward_type, reward_amount, weight, is_jackpot, created_at, updated_at)
            VALUES 
            ({r_cfg_id}, 0, '100 코인', 'POINT', 100, 30, 0, NOW(), NOW()),
            ({r_cfg_id}, 1, '200 코인', 'POINT', 200, 25, 0, NOW(), NOW()),
            ({r_cfg_id}, 4, '1,000 코인', 'POINT', 1000, 8, 1, NOW(), NOW())
        """))
        
        # 2. Lottery: Active Config with 'Gift' prizes
        db.execute(text("INSERT INTO lottery_config (name, is_active, max_daily_tickets, created_at, updated_at) VALUES ('Legacy Lottery', 1, 0, NOW(), NOW())"))
        l_cfg_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        
        # Prizes: Small Gift (50)
        db.execute(text(f"""
            INSERT INTO lottery_prize (config_id, label, reward_type, reward_amount, weight, is_active, created_at, updated_at)
            VALUES 
            ({l_cfg_id}, '소형 선물', 'POINT', 50, 30, 1, NOW(), NOW()),
            ({l_cfg_id}, '대형 선물', 'POINT', 500, 15, 1, NOW(), NOW())
        """))
        
        db.commit()
        print(f"[Setup] Created Legacy Roulette {r_cfg_id} and Lottery {l_cfg_id}")
        return r_cfg_id, l_cfg_id
    finally:
        db.close()

def run_deploy_script():
    print("\n[Action] Running deploy_update_game_config_v3.py...")
    env = os.environ.copy()
    env["DATABASE_URL"] = DB_URL
    env["PYTHONIOENCODING"] = "utf-8"
    
    cmd = [sys.executable, "scripts/deploy_update_game_config_v3.py"]
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)
    
    print(result.stdout)
    if result.returncode != 0:
        print("STDERR:", result.stderr)
        raise Exception("Deploy script failed")

def verify_updates(r_id, l_id):
    engine = create_engine(DB_URL)
    db = sessionmaker(bind=engine)()
    try:
        print("\n[Verify] Checking Updates...")
        
        # 1. Roulette: Check Slot 0 ('100 P') and Slot 4 ('200 XP')
        # Note: Slot 4 was '1,000 Coin'. Deploy script should update it to '200 XP'.
        
        s0 = db.execute(text(f"SELECT label, reward_type FROM roulette_segment WHERE config_id={r_id} AND slot_index=0")).fetchone()
        s4 = db.execute(text(f"SELECT label, reward_type FROM roulette_segment WHERE config_id={r_id} AND slot_index=4")).fetchone()
        
        print(f"  Roulette Slot 0: {s0}")
        print(f"  Roulette Slot 4: {s4}")
        
        assert s0[0] == "100 P" and s0[1] == "POINT", "Slot 0 mismatch"
        assert s4[0] == "200 XP" and s4[1] == "GAME_XP", "Slot 4 mismatch (XP Update)"
        
        # 2. Lottery: Check '50 P' (was 'Small Gift')
        # Deploy script maps 50 -> "50 P" based on amount.
        p50 = db.execute(text(f"SELECT label, reward_type FROM lottery_prize WHERE config_id={l_id} AND reward_amount=50")).fetchone()
        
        # Check XP Prize Addition (100 XP)
        xp_prize = db.execute(text(f"SELECT label, reward_type FROM lottery_prize WHERE config_id={l_id} AND reward_type='GAME_XP'")).fetchone()
        
        print(f"  Lottery Prize 50: {p50}")
        print(f"  Lottery XP Prize: {xp_prize}")
        
        assert p50[0] == "50 P", "Lottery label mismatch"
        assert xp_prize is not None, "Lottery XP Prize missing"
        
        print("✅ Config Verification SUCCESS!")
        
    finally:
        # Cleanup
        db.execute(text(f"DELETE FROM roulette_config WHERE id={r_id}"))
        db.execute(text(f"DELETE FROM lottery_config WHERE id={l_id}"))
        db.commit()
        db.close()

def main():
    try:
        r_id, l_id = setup_legacy_config()
        run_deploy_script()
        verify_updates(r_id, l_id)
    except Exception as e:
        print(f"\n❌ Verification FAILED: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
