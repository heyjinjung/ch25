from datetime import datetime
from sqlalchemy import select, func
from app.db.session import SessionLocal
from app.models.user import User
from app.models.vault2 import VaultStatus

def check_vaults():
    db = SessionLocal()
    now = datetime.utcnow()
    try:
        # 1. Phase 1 (User table)
        # Users with balance > 0
        all_locked = db.execute(
            select(func.sum(User.vault_locked_balance))
            .where(User.vault_locked_balance > 0)
        ).scalar() or 0
        
        # Pending expiration (expired but not yet processed)
        pending_expired = db.execute(
            select(func.sum(User.vault_locked_balance))
            .where(
                User.vault_locked_balance > 0,
                User.vault_locked_expires_at <= now
            )
        ).scalar() or 0
        
        # Active (timer set but not yet expired)
        active_timer = db.execute(
            select(func.sum(User.vault_locked_balance))
            .where(
                User.vault_locked_balance > 0,
                User.vault_locked_expires_at > now
            )
        ).scalar() or 0
        
        # No timer set (but has balance)
        no_timer = db.execute(
            select(func.sum(User.vault_locked_balance))
            .where(
                User.vault_locked_balance > 0,
                User.vault_locked_expires_at == None
            )
        ).scalar() or 0

        # count users
        user_count_pending = db.execute(
            select(func.count(User.id))
            .where(User.vault_locked_balance > 0, User.vault_locked_expires_at <= now)
        ).scalar() or 0

        print("--- Vault Phase 1 (User Table) ---")
        print(f"Total Locked Balance: {all_locked:,} P")
        print(f"Pending Expiration:   {pending_expired:,} P ({user_count_pending} users)")
        print(f"Active Timer:         {active_timer:,} P")
        print(f"No Timer Set:         {no_timer:,} P")
        print(f"Current UTC: {now}")
        print("")

        # 2. Phase 2 (VaultStatus table) - just in case it's used
        v2_locked = db.execute(select(func.sum(VaultStatus.locked_amount))).scalar() or 0
        v2_expired = db.execute(
            select(func.sum(VaultStatus.locked_amount))
            .where(VaultStatus.expires_at <= now, VaultStatus.state == "LOCKED")
        ).scalar() or 0
        
        print("--- Vault Phase 2 (VaultStatus Table) ---")
        print(f"Total V2 Locked:      {v2_locked:,} P")
        print(f"Pending V2 Expiration:{v2_expired:,} P")

    finally:
        db.close()

if __name__ == "__main__":
    check_vaults()
