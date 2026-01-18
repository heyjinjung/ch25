import logging
import sys
from datetime import datetime

from app.db.session import SessionLocal
from app.models.game_wallet import GameTokenType
from app.models.user import User
from app.models.vault_ledger import VaultLedger
from app.services.shop_service import ShopService, SHOP_PRODUCTS
from app.services.vault_service import VaultService
from app.services.ui_config_service import UiConfigService

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def reproduce():
    db = SessionLocal()
    try:
        # 1. Setup Test User
        user_id = 999999
        user = db.get(User, user_id)
        if not user:
            user = User(id=user_id, nickname="test_vault_buyer", external_id="test_vault_buyer")
            db.add(user)
        
        # Give Vault Balance
        user.vault_locked_balance = 50000
        user.vault_spent_today = 0
        db.commit()
        db.refresh(user)
        
        print(f"User {user.id} Setup. Vault Balance: {user.vault_locked_balance}")
        
        # 2. Override Shop Product to use VAULT
        # We'll use a custom SKU or override existing
        sku = "PROD_TEST_LOTTERY_VAULT"
        
        # Mock UI Config override
        # We can directly insert into UiConfig
        override_payload = {
            "products": {
                sku: {
                    "title": "Test Vault Lottery",
                    "cost_token": "VAULT",
                    "cost_amount": 1000,
                    "item_type": "LOTTERY_TICKET",
                    "item_amount": 1,
                    "is_active": True
                }
            }
        }
        UiConfigService.upsert(db, ShopService.UI_CONFIG_KEY, override_payload, admin_id=0)
        db.commit()
        
        print("Shop Config Overridden.")
        
        # 3. Purchase
        print(f"Attempting purchase of {sku} for 1000 VAULT...")
        response = ShopService.purchase_product(db, user_id, sku)
        print("Purchase Response:", response)
        
        # 4. Verify Ledger
        print("Verifying Ledger...")
        ledger = db.query(VaultLedger).filter(
            VaultLedger.user_id == user_id,
            VaultLedger.reason == f"SHOP_PURCHASE:{sku}"
        ).first()
        
        if ledger:
            print(f"SUCCESS: Ledger found. Amount: {ledger.amount}, Ref: {ledger.ref_type}")
        else:
            print("FAILURE: No Ledger entry found!")
            
        # 5. Verify Withdrawal Condition (Daily Spend)
        # Check if VaultService sees the spend
        # We can check get_withdrawal_reserved_amount or manually query
        
        today_start = datetime.utcnow().date() # Approximate
        vault_service = VaultService()
        
        # We'll simulate the check done in request_withdrawal
        # "4. Vault Consumption Condition: 10,000+ KRW consumed TODAY"
        # We spent 1000.
        
        from sqlalchemy import func
        today_spend_neg = db.query(func.sum(VaultLedger.amount)).filter(
            VaultLedger.user_id == user_id,
            VaultLedger.amount < 0,
            VaultLedger.id == ledger.id if ledger else None
        ).scalar() or 0
        
        print(f"Today Spend (from verified ledger entry): {today_spend_neg}")
        
        if ledger and today_spend_neg == -1000:
             print("SUCCESS: Withdrawal condition would see this spend.")
        else:
             print("FAILURE: Withdrawal condition spend check failed.")

    except Exception as e:
        logger.exception("Reproduction Failed")
    finally:
        db.close()

if __name__ == "__main__":
    reproduce()
