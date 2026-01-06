import sys
import os
import subprocess
import time
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# DB Connection for Local Host
# Assuming docker-compose maps 3306 -> 3307
DB_URL = "mysql+pymysql://xmasuser:2026@127.0.0.1:3307/xmas_event"

def setup_test_data():
    engine = create_engine(DB_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        # Create user
        print("[Setup] Creating test user for migration...")
        db.execute(text("DELETE FROM user WHERE external_id='mig_test_01'"))
        db.commit()

        db.execute(text("""
            INSERT INTO user (external_id, nickname, status, cash_balance, vault_locked_balance, vault_balance, created_at, updated_at)
            VALUES ('mig_test_01', 'Migration Tester', 'ACTIVE', 5000, 1000, 1000, NOW(), NOW())
        """))
        user_id = db.execute(text("SELECT id FROM user WHERE external_id='mig_test_01'")).scalar()
        db.commit()
        print(f"[Setup] Created User ID: {user_id} with Cash=5000, Vault=1000")
        return user_id, 5000, 1000
    finally:
        db.close()

def verify_data(user_id, expected_cash, expected_vault):
    engine = create_engine(DB_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        row = db.execute(text("SELECT cash_balance, vault_locked_balance, vault_balance FROM user WHERE id=:uid"), {"uid": user_id}).fetchone()
        curr_cash, curr_vault, curr_legacy = row
        print(f"[Verify] User {user_id}: Cash={curr_cash} (Expected {expected_cash}), Vault={curr_vault} (Expected {expected_vault})")
        
        assert curr_cash == expected_cash, f"Cash mismatch! Got {curr_cash}, want {expected_cash}"
        assert curr_vault == expected_vault, f"Vault mismatch! Got {curr_vault}, want {expected_vault}"
        assert curr_legacy == expected_vault, f"Legacy Vault mismatch! Got {curr_legacy}, want {expected_vault}"
        
        if expected_cash == 0 and expected_vault > 1000:
            # Check Ledger
            ledger = db.execute(text("""
                SELECT delta, balance_after, reason FROM user_cash_ledger 
                WHERE user_id=:uid AND reason='CASH_TO_VAULT_MIGRATION'
                ORDER BY id DESC LIMIT 1
            """), {"uid": user_id}).fetchone()
            if ledger:
                print(f"[Verify] Ledger Found: Delta={ledger[0]}, BalanceAfter={ledger[1]}")
            else:
                print(f"[Verify] ❌ Ledger entry MISSING for migration!")
                return False

            # Check Idempotency
            idem = db.execute(text("""
                SELECT * FROM user_idempotency_key 
                WHERE user_id=:uid AND scope='MIGRATION_V3' AND idempotency_key='CASH_TO_VAULT'
            """), {"uid": user_id}).fetchone()
            if idem:
                print(f"[Verify] Idempotency Key Found: Scope={idem.scope}")
            else:
                print(f"[Verify] ❌ Idempotency Key MISSING!")
                return False
                
        return True
    finally:
        db.close()

def run_migration_script(execute=False):
    env = os.environ.copy()
    env["DATABASE_URL"] = DB_URL
    
    cmd = [sys.executable, "scripts/migrate_cash_to_vault.py"]
    if execute:
        cmd.append("--execute")
        
    print(f"\n[Action] Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    return result.returncode

def main():
    try:
        # 1. Setup
        user_id, initial_cash, initial_vault = setup_test_data()
        
        # 2. Dry Run
        print("\n--- Test 1: Dry Run ---")
        run_migration_script(execute=False)
        # Verify NO change
        verify_data(user_id, initial_cash, initial_vault)
        
        # 3. Execution
        print("\n--- Test 2: Execute ---")
        run_migration_script(execute=True)
        # Verify Change
        expected_vault = initial_vault + initial_cash
        verify_data(user_id, 0, expected_vault)
        
        print("\n✅ Verification SUCCESS!")
        
    except Exception as e:
        print(f"\n❌ Verification FAILED: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
