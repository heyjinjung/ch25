
import sys
import os

# Add app to path
sys.path.append(os.getcwd())

# ALL CAPS to ensure it overrides config
os.environ["DATABASE_URL"] = "mysql+pymysql://root:2026@localhost:3307/xmas_event"

from app.db.session import SessionLocal
from app.services.user_segment_service import UserSegmentService

def verify():
    db = SessionLocal()
    try:
        print("Fetching CRM Stats...")
        stats = UserSegmentService.get_overall_stats(db)
        
        print("\n--- KPI Verification ---")
        print(f"Total Users: {stats.get('total_users')}")
        print(f"Roulette Spins: {stats.get('roulette_spins')} (Expected >= 84)")
        print(f"Dice Rolls: {stats.get('dice_rolls')} (Expected >= 52)")
        print(f"Avg Vault Balance: {stats.get('avg_vault_balance')} (Expected ~1033)")
        print(f"Total Deposit: {stats.get('total_deposit_amount')} (Financial KPI)")
        print(f"Total Play Count: {stats.get('total_play_count')} (Financial KPI)")
        
        if 'roulette_spins' not in stats:
            print("FAIL: roulette_spins missing")
            return
        if 'dice_rolls' not in stats:
            print("FAIL: dice_rolls missing")
            return
            
        print("\nSUCCESS: All new metrics present.")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify()
