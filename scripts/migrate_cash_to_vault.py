import sys
import os
import argparse
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.user import User
from app.models.user_cash_ledger import UserCashLedger
from app.models.idempotency import UserIdempotencyKey

def migrate_cash_to_vault():
    settings = get_settings()
    parser = argparse.ArgumentParser(description="Migrate legacy cash_balance to vault_locked_balance.")
    parser.add_argument("--execute", action="store_true", help="Execute the migration (default is dry-run)")
    args = parser.parse_args()

    execute_mode = args.execute
    print(f"=== Starting Cash to Vault Migration (Mode: {'EXECUTE' if execute_mode else 'DRY-RUN'}) ===")

    engine = create_engine(str(settings.database_url))
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Find eligible users (exclude those already migrated via idempotency if needed, 
        # but cash_balance check acts as primary filter. Idempotency is audit + safety).
        stmt = select(User).where(User.cash_balance > 0)
        users = db.execute(stmt).scalars().all()

        total_users = len(users)
        total_cash = sum(u.cash_balance for u in users)

        print(f"Target Users (cash > 0): {total_users}")
        print(f"Total Cash to Migrate: {total_cash:,} KRW")

        if total_users == 0:
            print("No users found with cash_balance > 0. Checking if everything is clean...")
        
        migrated_count = 0
        migrated_amount = 0
        skipped_count = 0

        SCOPES = "MIGRATION_V3"
        KEYS = "CASH_TO_VAULT"

        for user in users:
            original_cash = user.cash_balance
            
            # Idempotency Check
            # Check if we already processed this user for this scope/key (Double safety)
            existing_key = db.execute(select(UserIdempotencyKey).where(
                UserIdempotencyKey.user_id == user.id,
                UserIdempotencyKey.scope == SCOPES,
                UserIdempotencyKey.idempotency_key == KEYS
            )).scalar_one_or_none()

            if existing_key:
                print(f"  [Skip] User {user.id} already has idempotency record. (Manual check needed if cash > 0)")
                skipped_count += 1
                continue

            if not execute_mode:
                # Dry-run
                print(f"  [Dry-Run] User {user.id}: Cash {original_cash} -> Vault (Locked & Legacy Mirror)")
                migrated_count += 1
                migrated_amount += original_cash
                continue

            # Execute
            # 1. Update Vault (Locked + Legacy Mirror)
            user.vault_locked_balance += original_cash
            user.vault_balance += original_cash 
            user.cash_balance = 0
            
            # 2. Ledger
            ledger = UserCashLedger(
                user_id=user.id,
                delta=original_cash,
                balance_after=user.vault_locked_balance,
                reason="CASH_TO_VAULT_MIGRATION",
                label="통합 경제 이관",
                meta_json={
                    "migration": "v3_unified",
                    "original_cash": original_cash,
                    "migrated_at": datetime.utcnow().isoformat()
                },
                created_at=datetime.utcnow()
            )
            db.add(ledger)

            # 3. Idempotency Record
            idem = UserIdempotencyKey(
                user_id=user.id,
                scope=SCOPES,
                idempotency_key=KEYS,
                request_hash="MIGRATION_AUTO",
                request_json="{}",
                status="COMPLETED",
                response_json=f'{{"migrated_amount": {original_cash}}}',
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(idem)
            
            db.add(user)
            migrated_count += 1
            migrated_amount += original_cash

        if execute_mode:
            db.commit()
            print(f"\n[SUCCESS] Migrated {migrated_count} users. Total: {migrated_amount:,} KRW. Skipped: {skipped_count}")
            
            # Post-Check
            print("\n=== Post-Check Verification ===")
            remaining = db.execute(select(func.count(User.id), func.sum(User.cash_balance)).where(User.cash_balance > 0)).fetchone()
            rem_count = remaining[0] or 0
            rem_sum = remaining[1] or 0
            
            if rem_count == 0:
                print("[OK] [PASS] No users with cash_balance > 0 remaining.")
            else:
                print(f"[ERROR] [FAIL] {rem_count} users still have cash (Total: {rem_sum}). Please investigate.")
                
        else:
            print(f"\n[Dry-Run Result] Would migrate {migrated_count} users. Total: {migrated_amount:,} KRW.")
            print("Run with --execute to apply changes.")

    except Exception as e:
        print(f"[ERROR] Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_cash_to_vault()
