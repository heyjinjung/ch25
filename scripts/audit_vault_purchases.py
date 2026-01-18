import sys
import os
import logging
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.vault_ledger import VaultLedger
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.services.shop_service import ShopService
from app.services.vault_service import VaultService
from app.services.ui_config_service import UiConfigService

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def setup_fresh_user(db, user_id):
    """Creates a fresh user with ample balance for testing."""
    # Cleanup
    db.query(VaultLedger).filter(VaultLedger.user_id == user_id).delete()
    db.query(UserGameWallet).filter(UserGameWallet.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    db.commit()

    user = User(
        id=user_id, 
        nickname=f"AuditUser_{user_id}", 
        external_id=f"audit_{user_id}",
        vault_locked_balance=1000000, # 1M Vault
        vault_spent_total=0,
        vault_spent_today=0
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def run_audit():
    print("="*60)
    print("🔎 STARTING VAULT PURCHASE AUDIT")
    print("="*60)

    db = SessionLocal()
    shop_service = ShopService()
    
    try:
        # 1. Load All Products (including overrides)
        all_products = shop_service.list_products(db)
        
        # 2. Filter for VAULT cost
        # list_products returns dicts with structure: 
        # { "sku": ..., "cost": {"token": "...", "amount": ...}, ... }
        vault_products = []
        for p in all_products:
            cost = p.get("cost", {})
            token = cost.get("token")
            if token == GameTokenType.VAULT.value or token == "VAULT":
                vault_products.append(p)
        
        if not vault_products:
            print("⚠️  No products found with cost_token='VAULT'. Audit skipped.")
            return

        print(f"📋 Found {len(vault_products)} Vault-based products to test.\n")

        # 3. Test Each Product
        test_user_id = 999111
        user = setup_fresh_user(db, test_user_id)
        
        failures = []
        successes = []

        for p in vault_products:
            sku = p["sku"]
            cost_amount = p["cost"]["amount"]
            title = p.get("title", sku)
            
            print(f"👉 Testing Product: [{sku}] {title} (Cost: {cost_amount} VAULT)")
            
            # Reset daily spend for clarity (optional, but good for isolation)
            user.vault_spent_today = 0
            db.commit()
            
            initial_balance = user.vault_locked_balance
            initial_ledger_count = db.query(VaultLedger).filter(VaultLedger.user_id == user.id).count()
            
            try:
                # Execute Purchase
                shop_service.purchase_product(db, user.id, sku)
                
                # Refresh User
                db.refresh(user)
                
                # Check DB Logic
                # A. Balance Deducted
                expected_balance = initial_balance - cost_amount
                if user.vault_locked_balance != expected_balance:
                    raise Exception(f"Balance Mismatch! Expected {expected_balance}, Got {user.vault_locked_balance}")
                
                # B. Ledger Created
                final_ledger_count = db.query(VaultLedger).filter(VaultLedger.user_id == user.id).count()
                if final_ledger_count != initial_ledger_count + 1:
                     raise Exception(f"Ledger Entry Missing! Count {initial_ledger_count} -> {final_ledger_count}")
                
                # C. Check Specific Ledger Content
                ledger = db.query(VaultLedger).filter(
                    VaultLedger.user_id == user.id,
                    VaultLedger.reason.contains(sku)
                ).order_by(VaultLedger.id.desc()).first()
                
                if not ledger:
                     raise Exception(f"Specific Ledger for {sku} not found!")

                print(f"   ✅ PASS: Balance -{cost_amount}, Ledger Created.")
                successes.append(sku)

            except Exception as e:
                print(f"   ❌ FAIL: {e}")
                failures.append({"sku": sku, "error": str(e)})

        # 4. Final Report
        print("\n" + "="*60)
        print("📊 AUDIT SUMMARY")
        print("="*60)
        print(f"Total Tested: {len(vault_products)}")
        print(f"✅ Success: {len(successes)}")
        print(f"❌ Failures: {len(failures)}")
        
        if failures:
            print("\n🚨 FAILURE DETAILS:")
            for f in failures:
                print(f"  - {f['sku']}: {f['error']}")
        else:
            print("\n✨ ALL SYSTEM CHECKS PASSED. Standard Vault Purchases are Healthy.")

    except Exception as e:
        logger.exception("Audit Script Crash")
    finally:
        db.close()

if __name__ == "__main__":
    run_audit()
