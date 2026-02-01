"""V2 Pydantic schemas for Shop product overrides / custom products.

These schemas provide strict validation for admin-driven runtime changes
to shop products without code deploys.

We store data in AppUiConfig key `shop_products`.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.base import KstBaseModel
from app.v2.models import GameTokenType


class ShopProductPatch(KstBaseModel):
    """A patch for a single product SKU."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=100)
    cost_token: Optional[GameTokenType] = Field(default=None)
    cost_amount: Optional[int] = Field(default=None, ge=1)
    item_type: Optional[str] = Field(default=None, min_length=1, max_length=100)
    item_amount: Optional[int] = Field(default=None, ge=1, le=1_000_000)
    is_active: Optional[bool] = Field(default=None)

    @field_validator("title")
    @classmethod
    def strip_title(cls, v):
        if v:
            return v.strip()
        return v

    @field_validator("item_type")
    @classmethod
    def strip_item_type(cls, v):
        if v:
            return v.strip()
        return v


class ShopOverridesPayload(KstBaseModel):
    """
    Payload for PUT /admin/api/shop/products/overrides.

    Expected JSON shape:
    {
        "products": {
            "PROD_GOLD_KEY_1": { "title": "...", "cost_amount": 50 },
            ...
        }
    }
    """
    products: Optional[dict[str, ShopProductPatch]] = Field(default=None)
    deleted_skus: Optional[list[str]] = Field(default=None)

    @model_validator(mode="before")
    @classmethod
    def handle_empty_products(cls, values):
        """Normalize payload.

        Backward-compat: older clients send {"value": {...}}.
        """
        if values is None:
            return {"products": None, "deleted_skus": None}
        if isinstance(values, dict) and isinstance(values.get("value"), dict):
            return values["value"]
        if isinstance(values, dict):
            return values
        return {"products": None, "deleted_skus": None}
