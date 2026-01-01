import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.services.inventory_service import InventoryService
from app.services.shop_service import ShopService
from app.services.game_wallet_service import GameWalletService
from app.services.reward_service import RewardService
from app.models.game_wallet import GameTokenType
from app.models.user import User
from app.models.inventory import UserInventoryItem

def verify_phase_2():
    db = SessionLocal()
    try:
        # 1. Setup Test User
        user_id = 999998 # Different user for Phase 2
        user = db.get(User, user_id)
        if not user:
            user = User(id=user_id, external_id="phase2_test_user")
            db.add(user)
            db.commit()
        
        print(f"Test User ID: {user_id}")

        # 2. Reset State
        wallet_service = GameWalletService()
        # Reset Inventory Diamond
        db.query(UserInventoryItem).filter(UserInventoryItem.user_id == user_id).delete()
        # Reset Wallet (just in case)
        if wallet_service.get_balance(db, user_id, GameTokenType.DIAMOND) > 0:
             wallet_service.revoke_tokens(db, user_id, GameTokenType.DIAMOND, wallet_service.get_balance(db, user_id, GameTokenType.DIAMOND), "RESET")
        if wallet_service.get_balance(db, user_id, GameTokenType.GOLD_KEY) > 0:
             wallet_service.revoke_tokens(db, user_id, GameTokenType.GOLD_KEY, wallet_service.get_balance(db, user_id, GameTokenType.GOLD_KEY), "RESET")
        
        db.commit()
        print("State reset complete.")

        # 3. Grant Diamond (Should go to Inventory now)
        print(">>> Granting 100 DIAMONDS via RewardService...")
        reward_service = RewardService()
        # Using string "DIAMOND" which RewardService should now intercept
        reward_service.grant_ticket(db, user_id, "DIAMOND", 100, meta={"reason": "TEST_PHASE_2"})

        # Verify Inventory has DIAMOND
        inventory = InventoryService.get_inventory(db, user_id)
        diamond_item = next((i for i in inventory if i.item_type == "DIAMOND"), None)
        print(f"Inventory DIAMOND: {diamond_item.quantity if diamond_item else 'None'}")
        
        assert diamond_item is not None
        assert diamond_item.quantity == 100
        
        # Verify Wallet has 0 DIAMOND
        wallet_diamond = wallet_service.get_balance(db, user_id, GameTokenType.DIAMOND)
        print(f"Wallet DIAMOND: {wallet_diamond}")
        assert wallet_diamond == 0

        # 4. Purchase Voucher (Cost 30 DIAMOND, Should consume from Inventory)
        sku = "PROD_GOLD_KEY_1"
        print(f">>> Purchasing Product {sku}...")
        # Note: ShopProduct definition still uses GameTokenType.DIAMOND as cost marker, 
        # but ShopService should redirect to Inventory consumption.
        purchase_res = ShopService.purchase_product(db, user_id, sku)
        print("Purchase Result:", purchase_res)

        # Verify Inventory Deduction (100 - 30 = 70)
        db.refresh(diamond_item)
        print(f"Inventory DIAMOND After Purchase: {diamond_item.quantity}")
        assert diamond_item.quantity == 70
        
        # Verify Wallet is still 0
        wallet_diamond = wallet_service.get_balance(db, user_id, GameTokenType.DIAMOND)
        assert wallet_diamond == 0

        # Verify Voucher Grant
        inventory_items = InventoryService.get_inventory(db, user_id)
        voucher_item = next((i for i in inventory_items if i.item_type == "VOUCHER_GOLD_KEY_1"), None)
        
        print(f"Inventory Voucher: {voucher_item.quantity if voucher_item else 'None'}")
        assert voucher_item is not None
        assert voucher_item.quantity == 1

        print(">>> ALL CHECKS PASSED: Phase 2 Flow Verified!")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"FAILED: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_phase_2()
