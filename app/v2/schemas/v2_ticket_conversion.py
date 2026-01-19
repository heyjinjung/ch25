"""V2 ticket conversion policy schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import ConfigDict, Field, field_validator

from app.schemas.base import KstBaseModel as BaseModel
from app.v2.schemas.v2_admin_game_config import TicketType


class V2TicketConversionPolicyBase(BaseModel):
    target_ticket_type: TicketType
    ratio_numerator: int = Field(default=1, ge=1)
    ratio_denominator: int = Field(default=1, ge=1)
    is_active: bool = True

    @field_validator("ratio_numerator", "ratio_denominator")
    @classmethod
    def validate_ratio_value(cls, value: int) -> int:
        if value != 1:
            raise ValueError("ratio must be 1:1")
        return value


class V2TicketConversionPolicyCreate(V2TicketConversionPolicyBase):
    pass


class V2TicketConversionPolicyResponse(V2TicketConversionPolicyBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
