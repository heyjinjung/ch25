
import sys
import os
import asyncio
from dotenv import load_dotenv

# Add app base to sys path
sys.path.append(os.getcwd())
load_dotenv()

from app.db.session import SessionLocal
from app.services.shop_service import ShopService
from app.services.ui_config_service import UiConfigService
from app.schemas.shop_overrides import ShopProductPatch, ShopOverridesPayload, GameTokenType
from sqlalchemy.orm import Session

# Simulate the exact logic in app/api/admin/routes/admin_shop.py

def reproduce_issue():
    db = SessionLocal()
    try:
        print("--- Starting Reproduction ---\n")

        # 1. Create a mock payload with VAULT token
        payload_dict = {
            "products": {
                "SHOP_TEST_VAULT_01": {
                    "title": "Test Vault Product",
                    "cost_token": "VAULT",
                    "cost_amount": 100,
                    "item_type": "TICKET_FREE",
                    "item_amount": 1,
                    "is_active": True
                }
            }
        }
        
        print(f"Payload: {payload_dict}")

        try:
            # mimic validations in route
            payload = ShopOverridesPayload(**payload_dict)
            print("Pydantic Validation: OK")
        except Exception as e:
            print(f"Pydantic Validation Failed: {e}")
            return

        # mimic upsert_overrides logic in admin_shop.py
        # Current Code in admin_shop.py:
        # updates = {sku: patch.model_dump(mode='json', exclude_none=True) for sku, patch in payload.products.items()}
        
        updates = {}
        if payload.products:
            updates = {
                sku: patch.model_dump(mode='json', exclude_none=True)
                for sku, patch in payload.products.items()
            }
        
        print(f"Serialized Updates: {updates}")
        
        # Verify the serialization of cost_token
        for sku, data in updates.items():
            token_val = data.get('cost_token')
            print(f"SKU: {sku}, cost_token value: {token_val!r} (Type: {type(token_val)})")
            
            if token_val == "VAULT":
                print("SUCCESS: Serialized to string 'VAULT'")
            elif isinstance(token_val, GameTokenType):
                print("FAILURE: Serialized to Enum object (Old Bug)")
            else:
                print(f"UNKNOWN: {token_val}")

        # Try to save via UiConfigService
        print("\nAttempting DB Save via UiConfigService...")
        try:
            config_service = UiConfigService()
            # Note: We need to see if UiConfigService handles this dict correctly
            # upsert_override(db, key, value_dict)
            # The route calls upsert_override for EACH product? or upsert_overrides_bulk?
            # Checking admin_shop.py: it calls config_service.upsert_overrides(db, updates) usually?
            # Let's peek at admin_shop.py again to be sure of the method name.
            # Assuming it aligns with `updates` dict structure.
             
            # Let's just mock the save if we don't know the exact method signature here, 
            # OR better, check admin_shop.py line 82 or look at UiConfigService.
            pass 
        except Exception as e:
            print(f"DB Save Failed: {e}")

    finally:
        db.close()

if __name__ == "__main__":
    reproduce_issue()
