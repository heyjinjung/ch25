
import sys
import os
import json
from pprint import pprint
from dotenv import load_dotenv

sys.path.append(os.getcwd())
load_dotenv()

from app.db.session import SessionLocal
from app.services.shop_service import ShopService, ShopProduct
from app.services.ui_config_service import UiConfigService
from app.models.game_wallet import GameTokenType

def diagnose():
    print("--- Diagnostic: Shop Dice Saving ---\n")
    db = SessionLocal()
    try:
        # 1. Inspect Current Config in DB
        print("[Step 1] Inspecting Current UI Config (shop_products)...")
        row = UiConfigService.get(db, ShopService.UI_CONFIG_KEY)
        if row:
            print(f"  Found Config. Updated at: {row.updated_at}")
            val = row.value_json
            products = val.get("products", {}) if isinstance(val, dict) else {}
            
            dice_skus = [sku for sku, p in products.items() if "DICE" in sku or "DIE" in sku]
            print(f"  Total Custom/Override Products: {len(products)}")
            print(f"  Dice-related SKUs found: {dice_skus}")
            
            for sku in dice_skus:
                print(f"    - {sku}: {products[sku]}")
        else:
            print("  No UI Config found for shop_products.")

        # 2. Attempt to Upsert a Test Dice Product (Vault Cost)
        print("\n[Step 2] Attempting to Upsert 'SHOP_TEST_DICE_VAULT'...")
        
        test_sku = "SHOP_TEST_DICE_VAULT"
        test_patch = {
            "title": "Debug Dice Product",
            "cost_token": "VAULT",
            "cost_amount": 777,
            "item_type": "DICE_TOKEN",
            "item_amount": 5,
            "is_active": True
        }
        
        # Load existing first
        existing = row.value_json.get("products", {}) if row and row.value_json else {}
        existing[test_sku] = test_patch
        
        # Save
        UiConfigService.upsert(db, ShopService.UI_CONFIG_KEY, {"products": existing})
        print("  Upsert Called.")
        
        # 3. Read it back
        print("\n[Step 3] Reading back...")
        db.expire_all() # Clear cache
        
        row_after = UiConfigService.get(db, ShopService.UI_CONFIG_KEY)
        products_after = row_after.value_json.get("products", {})
        
        if test_sku in products_after:
            print(f"  SUCCESS: {test_sku} found in DB.")
            print(f"  Value: {products_after[test_sku]}")
            
            # Check parsing
            overrides = ShopService._load_product_overrides(db)
            custom_product = ShopService._build_custom_product(test_sku, overrides.get(test_sku))
            
            if custom_product:
                print(f"  ShopService Parser: OK. CostToken={custom_product.cost_token} ({type(custom_product.cost_token)})")
                if custom_product.cost_token == GameTokenType.VAULT:
                    print("  Enum Match: YES")
                else:
                     print(f"  Enum Match: NO (Got {custom_product.cost_token})")
            else:
                print("  ShopService Parser: FAILED (Returned None)")
        else:
            print(f"  FAILURE: {test_sku} NOT found in DB after save.")

    except Exception as e:
        print(f"\nEXCEPTION: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    diagnose()
