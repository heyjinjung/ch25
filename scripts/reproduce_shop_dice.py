
import sys
import os
import json
from dotenv import load_dotenv

# Add app base to sys path
sys.path.append(os.getcwd())
load_dotenv()

from app.models.game_wallet import GameTokenType
from app.services.shop_service import ShopService, ShopProduct
from app.schemas.shop_overrides import ShopOverridesPayload

def reproduce_issue():
    print("--- Repro: Dice vs Roulette vs Lottery (Vault Cost) ---\n")

    # 1. Define payloads akin to what Frontend sends
    # Note: Frontend sends string values for enums
    products_payload = {
        "SHOP_VAULT_ROULETTE": {
            "title": "Roulette via Vault",
            "cost_token": "VAULT",
            "cost_amount": 100,
            "item_type": "ROULETTE_COIN",
            "item_amount": 1,
            "is_active": True
        },
        "SHOP_VAULT_LOTTERY": {
            "title": "Lottery via Vault",
            "cost_token": "VAULT",
            "cost_amount": 200,
            "item_type": "LOTTERY_TICKET",
            "item_amount": 1,
            "is_active": True
        },
        "SHOP_VAULT_DICE": {
            "title": "Dice via Vault",
            "cost_token": "VAULT",
            "cost_amount": 300,
            "item_type": "DICE_TOKEN",
            "item_amount": 1,
            "is_active": True
        }
    }

    print("Step 1: Mock Frontend Payload")
    print(json.dumps(products_payload, indent=2))

    # 2. Validate via Pydantic (Backend Route Step 1)
    try:
        # ShopOverridesPayload expects "products" dict
        payload_obj = ShopOverridesPayload(products=products_payload)
        print("\nStep 2: Pydantic Validation Passed")
    except Exception as e:
        print(f"\nStep 2: Pydantic Validation FAILED: {e}")
        return

    # 3. Serialize to JSON-compatible dict (Backend Route Step 2)
    updates = {
        sku: patch.model_dump(mode='json', exclude_none=True)
        for sku, patch in payload_obj.products.items()
    }
    print(f"\nStep 3: Serialized Updates (for DB Storage)")
    print(json.dumps(updates, indent=2))

    # 4. Simulate Load & Parse (ShopService.list_products logic)
    # We pretend 'updates' was loaded from DB as 'overrides'
    print("\nStep 4: Simulate Loading & Parsing (_build_custom_product)")
    
    parsed_products = []
    failed_skus = []

    for sku, patch in updates.items():
        # Mimic list_products logic:
        custom = ShopService._build_custom_product(sku, patch)
        if custom is None:
            print(f"  [ERROR] Failed to build product for SKU: {sku}")
            failed_skus.append(sku)
        else:
            print(f"  [OK] Built product for SKU: {sku}")
            parsed_products.append(custom)

    print(f"\nSummary: {len(parsed_products)} succeeded, {len(failed_skus)} failed.")
    
    # 5. Check if Dice specifically failed
    dice_sku = "SHOP_VAULT_DICE"
    if dice_sku in failed_skus:
        print("\n!!! DICE PRODUCT FAIL REPRODUCED !!!")
    elif dice_sku in [p.sku for p in parsed_products]:
        print("\nDice product passed successfully locally.")
    else:
        print("\nDice product missing?")

    # 6. Check cost_token type in serialized output
    dice_update = updates.get("SHOP_VAULT_DICE", {})
    cost_token_raw = dice_update.get("cost_token")
    print(f"\nDebug: Dice cost_token in DB would be: {cost_token_raw!r} (Type: {type(cost_token_raw)})")
    
    # Check if 'VAULT' is valid in GameTokenType
    try:
        t = GameTokenType(cost_token_raw)
        print(f"GameTokenType('VAULT') conversion: OK -> {t}")
    except Exception as e:
        print(f"GameTokenType('VAULT') conversion: FAILED -> {e}")

if __name__ == "__main__":
    reproduce_issue()
