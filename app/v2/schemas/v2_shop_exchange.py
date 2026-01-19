"""V2 shop & exchange schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import ConfigDict, Field

from app.schemas.base import KstBaseModel as BaseModel


class V2ShopOrderBase(BaseModel):
    user_id: int
    sku: str
    name: str
    cost_type: Literal["VAULT"]
    cost_amount: int = Field(ge=0)
    reward_type: str
    reward_amount: int = Field(ge=0)


class V2ShopOrderCreate(V2ShopOrderBase):
    pass


class V2ShopOrderResponse(V2ShopOrderBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class V2ExchangeLogBase(BaseModel):
    user_id: int
    input_type: str
    input_amount: int = Field(ge=0)
    output_type: str
    output_amount: int = Field(ge=0)


class V2ExchangeLogCreate(V2ExchangeLogBase):
    pass


class V2ExchangeLogResponse(V2ExchangeLogBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
