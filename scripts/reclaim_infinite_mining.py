import sys
import os
import datetime

# Add parent directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.user import User
from app.models.inventory import UserInventoryItem

def main():
    settings = get_settings()
    engine = create_engine(settings.sqlalchemy_database_uri, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    target_nickname = "토쟁이"
    print(f"[*] Searching for user with nickname: {target_nickname}")

    user = db.query(User).filter(User.nickname == target_nickname).first()
    if not user:
        print(f"[!] User '{target_nickname}' not found!")
        if len(sys.argv) > 1 and sys.argv[1].isdigit():
             user_id = int(sys.argv[1])
             print(f"[*] Trying User ID from arg: {user_id}")
             user = db.query(User).filter(User.id == user_id).first()

    if not user:
        print("[!] No user found. Exiting.")
        return

    print(f"[*] Found User: ID={user.id}, Nickname={user.nickname}")
    print(f"    Created At: {user.created_at}")
    print("-" * 40)
    
    # 0. Check Deposits (Principal Protection)
    total_deposit = int(getattr(user, "total_charge_amount", 0) or 0)
    print(f"    [P] Total Deposit (Principal): {total_deposit:,} KRW")
    
    # 1. Inspect Vault Balance
    current_locked = int(getattr(user, "vault_locked_balance", 0) or 0)
    print(f"    [V] Current Vault Locked:      {current_locked:,} KRW")
    
    # Heuristic: If Locked > Deposit * 10, likely exploit
    # But for safety, we allow admin to input the target balance.
    print(f"\n[1] Vault Balance Recovery")
    print(f"    We must respect the Principal ({total_deposit:,} KRW).")
    print(f"    Excess Amount: {max(0, current_locked - total_deposit):,} KRW")
    
    choice = input("    > [R]eset to 0, [K]eep Principal Only, [S]kip? (r/k/s): ").lower()
    
    vault_action_log = "SKIPPED"
    if choice == 'r':
        user.vault_locked_balance = 0
        user.vault_balance = 0
        db.add(user)
        print("    [+] Vault Reset to 0.")
        vault_action_log = "RESET_TO_ZERO"
    elif choice == 'k':
        user.vault_locked_balance = total_deposit
        # user.vault_balance = total_deposit # Legacy mirror might vary, but safer to sync
        db.add(user)
        print(f"    [+] Vault Set to Principal ({total_deposit:,} KRW).")
        vault_action_log = f"RESET_TO_PRINCIPAL_{total_deposit}"
    else:
        print("    [-] Skipped Vault adjustment.")

    # 2. Inspect Inventory
    print("\n[2] Inventory Inspection")
    target_items = [
        "BAEMIN_GIFTICON_2000", "BAEMIN_GIFTICON_5000", "BAEMIN_GIFTICON_10000", "BAEMIN_GIFTICON_20000",
        "ROULETTE_COIN", "DICE_TOKEN", "LOTTERY_TICKET"
    ]
    
    items = db.query(UserInventoryItem).filter(
        UserInventoryItem.user_id == user.id,
        UserInventoryItem.quantity > 0
    ).all()

    found_mining_items = [i for i in items if i.item_type in target_items or "GIFTICON" in i.item_type]

    revoked_items_log = []
    if not found_mining_items:
         print("    No suspicious items found in inventory.")
    else:
        print(f"    Found {len(found_mining_items)} suspicious item types:")
        for item in found_mining_items:
            print(f"    - {item.item_type}: {item.quantity} ea")
        
        confirm = input("    > Revoke ALL these items? (y/n): ")
        if confirm.lower() == 'y':
            for item in found_mining_items:
                revoked_items_log.append(f"{item.item_type}:{item.quantity}")
                item.quantity = 0
                db.add(item)
            print("      [+] All pending items revoked.")
        else:
            print("    [-] Skipped Inventory adjustment.")

    # Commit
    print("\n[3] Finalize")
    confirm = input("    > Commit changes to Database? (y/n): ")
    if confirm.lower() == 'y':
        try:
            db.commit()
            print("    [!] Success. Recovery complete.")
            
            # Write Log
            log_filename = f"reclaim_log_{user.id}_{datetime.date.today()}.txt"
            with open(log_filename, "w", encoding="utf-8") as f:
                f.write(f"Recovery Log for User {user.id} ({user.nickname})\n")
                f.write(f"Date: {datetime.datetime.now()}\n")
                f.write(f"Vault Action: {vault_action_log}\n")
                f.write(f"Revoked Items: {', '.join(revoked_items_log)}\n")
            print(f"    [i] Audit log saved to {log_filename}")
            
        except Exception as e:
            db.rollback()
            print(f"    [X] Error during commit: {str(e)}")
    else:
        db.rollback()
        print("    [-] Cancelled. No changes made.")

if __name__ == "__main__":
    main()
