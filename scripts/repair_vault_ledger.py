import sys
import os
import argparse
from datetime import datetime
from sqlalchemy import text

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.vault_ledger import VaultLedger
from app.services.vault_service import VaultService

def repair_ledger(user_id: int, amount: int, reason: str, dry_run: bool = True):
    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if not user:
            print(f"❌ User found with ID {user_id}")
            return

        print(f"🔍 Analyzing User: {user.nickname} (ID: {user.id})")
        print(f"   Current Vault Locked Balance: {user.vault_locked_balance}")
        print(f"   Current Vault Spent Total: {user.vault_spent_total}")
        print(f"   Current Vault Spent Today: {user.vault_spent_today}")
        
        print("\n🛠️  PROPOSED REPAIR ACTION:")
        print(f"   1. Insert VaultLedger: Amount = -{amount}, Reason = '{reason}', RefType = 'CONSUME'")
        print(f"   2. Update vault_spent_total: +{amount}")
        print(f"   3. Update vault_spent_today: +{amount} (Assuming purchase was today)")
        
        if dry_run:
            print("\n[DRY RUN] No changes made. Run with --execute to apply.")
            return

        # 1. Create Ledger
        # Note: We rely on the user having *already* lost the balance.
        # If they haven't lost balance yet, this script assumes specific manual correction.
        # But per issue description, user bought it (balance gone) but no history.
        # So we use current balance as 'balance_after'.
        
        ledger = VaultLedger(
            user_id=user.id,
            amount=-amount,
            balance_after=user.vault_locked_balance, # Assuming balance was already deducted
            reason=reason,
            ref_type="CONSUME"
        )
        db.add(ledger)
        
        # 2. Fix Stats
        # We manually update because we are retroactively fixing a missing record
        # preventing VaultService from doubling execution.
        user.vault_spent_total = int(user.vault_spent_total or 0) + amount
        user.vault_spent_today = int(user.vault_spent_today or 0) + amount
        
        db.commit()
        print("\n✅ REPAIR COMPLETE.")
        print(f"   New Vault Spent Total: {user.vault_spent_total}")
        
        # Verify
        check_ledger = db.query(VaultLedger).filter(
            VaultLedger.user_id == user.id,
            VaultLedger.reason == reason
        ).first()
        if check_ledger:
             print(f"   Verified Ledger Entry ID: {check_ledger.id}")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Repair Missing Vault Ledger")
    parser.add_argument("user_id", type=int, help="Target User ID")
    parser.add_argument("amount", type=int, help="Amount spent (positive integer, e.g. 1000)")
    parser.add_argument("--reason", type=str, default="MANUAL_FIX_MISSING_HISTORY", help="Ledger reason")
    parser.add_argument("--execute", action="store_true", help="Execute the changes")
    
    args = parser.parse_args()
    
    repair_ledger(args.user_id, args.amount, args.reason, not args.execute)
