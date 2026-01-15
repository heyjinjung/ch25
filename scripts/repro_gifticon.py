
import sys
import os

# Add project root to sys.path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.services.reward_service import RewardService
from app.services.inventory_service import InventoryService
from app.models.user import User

def test_gifticon_grant():
    db = SessionLocal()
    try:
        # Create or get test user
        user_id = 999999999
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            print(f"Creating test user {user_id}")
            user = User(id=user_id, external_id="test_repro_user")
            db.add(user)
            db.commit()

        rs = RewardService()
        
        print("--- Testing BAEMIN_GIFTICON_5000 ---")
        try:
            rs.deliver(db, user_id, "GIFTICON_BAEMIN", 5000, meta={"reason": "test"})
            print("Deliver called successfully.")
        except Exception as e:
            print(f"Deliver failed: {e}")

        # Check Inventory
        items = InventoryService.get_inventory(db, user_id)
        found = False
        for item in items:
            print(f"Found item: {item.item_type}, Quantity: {item.quantity}")
            if item.item_type == "BAEMIN_GIFTICON_5000" and item.quantity > 0:
                found = True
        
        if found:
            print("SUCCESS: BAEMIN_GIFTICON_5000 found in inventory.")
        else:
            print("FAILURE: BAEMIN_GIFTICON_5000 NOT found in inventory.")

        print("\n--- Testing COMPOSE_AMERICANO_GIFTICON_3000 via generic call ---")
        try:
            rs.deliver(db, user_id, "GIFTICON_COMPOSE", 3000, meta={"reason": "test"})
            print("Deliver called successfully.")
        except Exception as e:
            print(f"Deliver failed: {e}")

        items = InventoryService.get_inventory(db, user_id)
        found = False
        for item in items:
            if item.item_type == "COMPOSE_AMERICANO_GIFTICON_3000" and item.quantity > 0:
                print(f"Found item: {item.item_type}, Quantity: {item.quantity}")
                found = True
        
        if found:
            print("SUCCESS: COMPOSE_AMERICANO_GIFTICON_3000 found.")
        else:
            print("FAILURE: COMPOSE_AMERICANO_GIFTICON_3000 NOT found.")

    finally:
        db.close()

if __name__ == "__main__":
    test_gifticon_grant()
