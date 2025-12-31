from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any

from app.api import deps
from app.services.inventory_service import InventoryService
from app.services.shop_service import ShopService
from app.models.user import User

router = APIRouter()


@router.get("/inventory", response_model=dict)
def get_my_inventory(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
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
    if current_user.game_wallets:
        for w in current_user.game_wallets:
            wallet_data[w.token_type.value] = w.balance

    return {
        "items": [
            {
                "item_type": item.item_type, 
                "quantity": item.quantity,
                "created_at": item.created_at,
            } 
            for item in items
        ],
        "wallet": wallet_data
    }


@router.post("/inventory/use", response_model=dict)
def use_item(
    payload: dict,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
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
    result = InventoryService.use_voucher(db, current_user.id, item_type, amount)
    return result


@router.get("/shop/products", response_model=list[dict])
def list_products(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    List all available shop products.
    """
    return ShopService.list_products()


@router.post("/shop/purchase", response_model=dict)
def purchase_product(
    payload: dict,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Purchase a product.
    Payload: { "sku": "..." }
    """
    sku = payload.get("sku")
    if not sku:
        raise HTTPException(status_code=400, detail="MISSING_SKU")

    result = ShopService.purchase_product(db, current_user.id, sku)
    return result
