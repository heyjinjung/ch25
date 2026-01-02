"""Admin endpoints for shop product levers (price/active/title) without redeploy.

Storage:
- Uses AppUiConfig key `shop_products` to store per-SKU overrides.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_admin_id
from app.schemas.ui_config import UiConfigResponse, UiConfigUpsertRequest
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
    payload: UiConfigUpsertRequest,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    value = payload.value
    if value is not None and not isinstance(value, dict):
        raise HTTPException(status_code=400, detail="INVALID_VALUE")

    # Validate known shape to avoid bricking the shop.
    products = (value or {}).get("products") if isinstance(value, dict) else None
    if products is not None and not isinstance(products, dict):
        raise HTTPException(status_code=400, detail="INVALID_PRODUCTS")

    if isinstance(products, dict):
        for sku, patch in products.items():
            if sku not in SHOP_PRODUCTS:
                raise HTTPException(status_code=400, detail=f"UNKNOWN_SKU:{sku}")
            if not isinstance(patch, dict):
                raise HTTPException(status_code=400, detail=f"INVALID_PATCH:{sku}")

            title = patch.get("title")
            if title is not None and (not isinstance(title, str) or not title.strip()):
                raise HTTPException(status_code=400, detail=f"INVALID_TITLE:{sku}")

            cost_amount = patch.get("cost_amount")
            if cost_amount is not None and (not isinstance(cost_amount, int) or cost_amount <= 0):
                raise HTTPException(status_code=400, detail=f"INVALID_COST_AMOUNT:{sku}")

            is_active = patch.get("is_active")
            if is_active is not None and not isinstance(is_active, bool):
                raise HTTPException(status_code=400, detail=f"INVALID_IS_ACTIVE:{sku}")

    row = UiConfigService.upsert(db, ShopService.UI_CONFIG_KEY, value or {}, admin_id=admin_id)
    return UiConfigResponse(key=row.key, value=row.value_json, updated_at=row.updated_at)
