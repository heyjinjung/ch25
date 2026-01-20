"""Reset DB and create 10 test users (ASCII only)"""
import os
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
# Fix DB name
if DATABASE_URL and "/v2" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("/v2", "/xmas_event")
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)

def main():
    print("="*60)
    print("DB Reset - Creating 10 Test Users")
    print("="*60)

    response = input("Continue? (yes/no): ").strip().lower()
    if response not in ["yes", "y"]:
        print("Cancelled.")
        sys.exit(0)

    db = SessionLocal()
    try:
        # Get admin IDs (users with password_hash are admins)
        result = db.execute(text("SELECT id FROM user WHERE password_hash IS NOT NULL"))
        admin_ids = [row[0] for row in result.fetchall()]
        print(f"Admin accounts: {len(admin_ids)}")

        if not admin_ids:
            admin_ids = [0]
        admin_str = ",".join(map(str, admin_ids))

        # Clear data
        print("\nClearing data...")
        tables = [
            "user_mission_progress", "user_daily_gift", "user_game_wallet",
            "user_inventory_item", "user_streak", "roulette_spin_history",
            "dice_play_history", "lottery_purchase_history", "vault_transaction",
            "vault_ledger", "cc_deposit_log", "external_ranking_record",
            "audit_log", "reward_claim_log"
        ]
        for table in tables:
            try:
                db.execute(text(f"DELETE FROM {table} WHERE user_id NOT IN ({admin_str})"))
                print(f"  {table}: OK")
            except:
                pass

        db.execute(text(f"DELETE FROM user WHERE id NOT IN ({admin_str})"))
        db.commit()
        print("Data cleared")

        # Create test users
        print("\nCreating test users...")
        user_ids = []
        for i in range(1, 11):
            db.execute(
                text("""
                    INSERT INTO user (external_id, nickname, status, level, xp,
                    vault_locked_balance, vault_spent_total, created_at, updated_at)
                    VALUES (:eid, :nick, 'ACTIVE', 1, 0, 0, 0, NOW(), NOW())
                """),
                {"eid": f"test-user-{i:03d}", "nick": f"Tester{i:02d}"}
            )
            uid = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
            user_ids.append(uid)
            print(f"  User {uid}: test-user-{i:03d}")
        db.commit()

        # Initialize wallets
        print("\nInitializing wallets...")
        for uid in user_ids:
            for wtype, bal in [("ROULETTE_TICKET", 10), ("DICE_TICKET", 10),
                               ("LOTTERY_TICKET", 10), ("DIAMOND", 1000)]:
                db.execute(
                    text("""
                        INSERT INTO user_game_wallet (user_id, wallet_type, balance, created_at, updated_at)
                        VALUES (:uid, :wtype, :bal, NOW(), NOW())
                    """),
                    {"uid": uid, "wtype": wtype, "bal": bal}
                )
        db.commit()
        print("Wallets initialized")

        print("\n"+"="*60)
        print("SUCCESS!")
        print("="*60)
        print(f"Test accounts: {len(user_ids)}")
        print(f"Admin accounts: {len(admin_ids)} (preserved)")
        print("IDs: test-user-001 ~ test-user-010")

    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
