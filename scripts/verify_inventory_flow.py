import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.services.inventory_service import InventoryService
from app.services.shop_service import ShopService
from app.services.game_wallet_service import GameWalletService
from app.models.game_wallet import GameTokenType
from app.models.user import User
from app.models.inventory import UserInventoryItem

def verify_inventory():
    db = SessionLocal()
    try:
        # 1. Setup Test User
        user_id = 999999
        user = db.get(User, user_id)
        if not user:
            user = User(id=user_id, external_id="inventory_test_user")
            db.add(user)
            db.commit()
        
        print(f"Test User ID: {user_id}")

        # 2. Reset State (Ensure clean slate)
        # Clear wallet
        wallet_service = GameWalletService()
        current_diamond = wallet_service.get_balance(db, user_id, GameTokenType.DIAMOND)
        if current_diamond > 0:
            wallet_service.revoke_tokens(db, user_id, GameTokenType.DIAMOND, current_diamond, "RESET")
        current_gold_key = wallet_service.get_balance(db, user_id, GameTokenType.GOLD_KEY)
        if current_gold_key > 0:
            wallet_service.revoke_tokens(db, user_id, GameTokenType.GOLD_KEY, current_gold_key, "RESET")
        
        # Clear inventory
        db.query(UserInventoryItem).filter(UserInventoryItem.user_id == user_id).delete()
        db.commit()

        print("State reset complete.")

        # 3. Grant Wallet DIAMOND (Current Cost Source)
        print(">>> Granting 100 DIAMONDS...")
        wallet_service.grant_tokens(db, user_id, GameTokenType.DIAMOND, 100, "TEST_GRANT")
        
        balance_diamond = wallet_service.get_balance(db, user_id, GameTokenType.DIAMOND)
        print(f"Current DIAMOND Balance: {balance_diamond}")
        assert balance_diamond == 100

        # 4. Purchase Voucher (Gold Key Voucher, Cost 30)
        sku = "PROD_GOLD_KEY_1"
        print(f">>> Purchasing Product {sku}...")
        purchase_res = ShopService.purchase_product(db, user_id, sku)
        print("Purchase Result:", purchase_res)

        # Verify Wallet Deduction
        balance_diamond_after = wallet_service.get_balance(db, user_id, GameTokenType.DIAMOND)
        print(f"DIAMOND After Purchase: {balance_diamond_after}")
        assert balance_diamond_after == 70

        # Verify Inventory Grant
        inventory = InventoryService.get_inventory(db, user_id)
        voucher_item = next((i for i in inventory if i.item_type == "VOUCHER_GOLD_KEY_1"), None)
        print(f"Inventory Item: {voucher_item.item_type}, Qty: {voucher_item.quantity}")
        assert voucher_item is not None
        assert voucher_item.quantity == 1

        # 5. Use Voucher
        print(">>> Using Voucher...")
        use_res = InventoryService.use_voucher(db, user_id, "VOUCHER_GOLD_KEY_1", 1)
        print("Use Result:", use_res)

        # Verify Inventory Deduction
        db.refresh(voucher_item)
        print(f"Inventory After Use: {voucher_item.quantity}")
        assert voucher_item.quantity == 0

        # Verify Wallet Grant (Gold Key)
        balance_gold_key = wallet_service.get_balance(db, user_id, GameTokenType.GOLD_KEY)
        print(f"GOLD_KEY Balance: {balance_gold_key}")
        assert balance_gold_key == 1

        print(">>> ALL CHECKS PASSED: Inventory Service Flow Verified!")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"FAILED: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_inventory()
