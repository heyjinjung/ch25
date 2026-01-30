from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Any
from datetime import datetime

from app.api import deps
from app.services.inventory_service import InventoryService
from app.services.shop_service import ShopService
from app.v2.models.user import V2User

router = APIRouter()


@router.get("/inventory", response_model=dict)
def get_my_inventory(
    db: Session = Depends(deps.get_db),
    current_user: V2User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user's inventory (items) and wallet (tokens).
    """
    # 1. Get Items
    items = InventoryService.get_inventory(db, current_user.id)
    
    # 2. Get Wallet (Optional, but convenient for UI)
    # We can fetch wallet via relationship or GameWalletService.
    # User.game_wallets relationship should be available.
    wallet_data = {}
    legacy_diamond_balance: int | None = None
    if current_user.game_wallets:
        for w in current_user.game_wallets:
            # Phase 2 rule: DIAMOND is Inventory SoT, so hide it from wallet payload.
            if w.token_type.value == "DIAMOND":
                legacy_diamond_balance = int(w.balance or 0)
                continue
            wallet_data[w.token_type.value] = w.balance

    items_payload = [
        {
            "item_type": item.item_type,
            "quantity": item.quantity,
            "created_at": item.created_at,
        }
        for item in items
    ]

    # Legacy compatibility:
    # Some users may still have DIAMOND stored in wallet (pre-Phase2). If DIAMOND isn't present
    # in inventory items yet, expose it as an inventory item for UI visibility.
    if (legacy_diamond_balance or 0) > 0 and not any(p.get("item_type") == "DIAMOND" for p in items_payload):
        items_payload.append(
            {
                "item_type": "DIAMOND",
                "quantity": legacy_diamond_balance,
                "created_at": datetime.utcnow(),
            }
        )

    return {"items": items_payload, "wallet": wallet_data}


@router.post("/inventory/use", response_model=dict)
def use_item(
    payload: dict,
    db: Session = Depends(deps.get_db),
    current_user: V2User = Depends(deps.get_current_user),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> Any:
    """
    Use an inventory item (Voucher).
    Payload: { "item_type": "...", "amount": 1 }
    """
    item_type = payload.get("item_type")
    amount = payload.get("amount", 1)
    
    if not item_type:
        raise HTTPException(status_code=400, detail="MISSING_ITEM_TYPE")

    # Call Service
    idem = payload.get("idempotency_key") or idempotency_key
    result = InventoryService.use_voucher(db, current_user.id, item_type, amount, idempotency_key=idem)
    return result


@router.get("/shop/products", response_model=list[dict])
def list_products(
    db: Session = Depends(deps.get_db),
    current_user: V2User = Depends(deps.get_current_user),
) -> Any:
    """
    List all available shop products.
    """
    return ShopService.list_products(db)


@router.post("/shop/purchase", response_model=dict)
def purchase_product(
    payload: dict,
    db: Session = Depends(deps.get_db),
    current_user: V2User = Depends(deps.get_current_user),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> Any:
    """
    Purchase a product.
    Payload: { "sku": "..." }
    """
    sku = payload.get("sku")
    if not sku:
        raise HTTPException(status_code=400, detail="MISSING_SKU")

    idem = payload.get("idempotency_key") or idempotency_key
    result = ShopService.purchase_product(db, current_user.id, sku, idempotency_key=idem)
    return result
