"""Admin endpoints for shop product levers (price/active/title) without redeploy.

Storage:
- Uses AppUiConfig key `shop_products` to store per-SKU overrides.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_admin_id
from app.schemas.ui_config import UiConfigResponse
from app.schemas.shop_overrides import ShopOverridesPayload
from app.services.shop_service import SHOP_PRODUCTS, ShopService
from app.services.ui_config_service import UiConfigService

router = APIRouter(prefix="/admin/api/shop", tags=["admin-shop"])


@router.get("/products", response_model=list[dict])
def list_products(db: Session = Depends(get_db)):
    return ShopService.list_products(db)


@router.get("/products/overrides", response_model=UiConfigResponse)
def get_overrides(db: Session = Depends(get_db)):
    row = UiConfigService.get(db, ShopService.UI_CONFIG_KEY)
    if not row:
        return UiConfigResponse(key=ShopService.UI_CONFIG_KEY, value=None, updated_at=None)
    return UiConfigResponse(key=row.key, value=row.value_json, updated_at=row.updated_at)


@router.put("/products/overrides", response_model=UiConfigResponse)
def upsert_overrides(
    payload: ShopOverridesPayload,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    """
    Update shop product overrides with Pydantic-validated payload.

    Expected body:
    {
        "products": {
            "PROD_GOLD_KEY_1": { "title": "...", "cost_amount": 50, "is_active": true }
        }
    }
    """
    # Validate SKUs
    # - Builtin SKU: patch allowed (partial)
    # - Custom SKU (not in SHOP_PRODUCTS): requires full definition
    if payload.products:
        for sku, patch in payload.products.items():
            if sku in SHOP_PRODUCTS:
                continue

            missing = []
            if not getattr(patch, "title", None):
                missing.append("title")
            if getattr(patch, "cost_token", None) is None:
                missing.append("cost_token")
            if getattr(patch, "cost_amount", None) is None:
                missing.append("cost_amount")
            if not getattr(patch, "item_type", None):
                missing.append("item_type")
            if getattr(patch, "item_amount", None) is None:
                missing.append("item_amount")

            if missing:
                raise HTTPException(
                    status_code=400,
                    detail=f"MISSING_FIELDS_FOR_NEW_SKU:{sku}:{','.join(missing)}",
                )

    # Serialize Pydantic models to dict for storage
    updates = {}
    if payload.products:
        updates = {
            sku: patch.model_dump(exclude_none=True)
            for sku, patch in payload.products.items()
        }

    # Fetch existing config to merge
    existing_row = UiConfigService.get(db, ShopService.UI_CONFIG_KEY)
    current_value = existing_row.value_json if existing_row else {}
    current_products = current_value.get("products", {})

    # Merge updates into current products
    # This ensures we don't wipe out other SKUs if we send a partial update
    merged_products = {**current_products, **updates}

    # Apply deletions only for custom products.
    # Builtin products should be disabled via is_active=false (soft-delete).
    if payload.deleted_skus:
        for sku in payload.deleted_skus:
            if not isinstance(sku, str):
                continue
            if sku in SHOP_PRODUCTS:
                continue
            merged_products.pop(sku, None)

    value_to_store = {"products": merged_products}

    row = UiConfigService.upsert(db, ShopService.UI_CONFIG_KEY, value_to_store, admin_id=admin_id)
    return UiConfigResponse(key=row.key, value=row.value_json, updated_at=row.updated_at)
