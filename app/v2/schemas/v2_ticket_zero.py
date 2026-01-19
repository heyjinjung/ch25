"""V2 ticket zero schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import ConfigDict, Field

from app.schemas.base import KstBaseModel as BaseModel
from app.v2.schemas.v2_admin_game_config import TicketType


class V2TicketZeroLogBase(BaseModel):
    user_id: int
    ticket_type: TicketType = "ROULETTE_TICKET"
    ticket_amount: int = Field(default=1, ge=1)
    reason: Literal["BAILOUT_GRANT"] = "BAILOUT_GRANT"
    granted_at: datetime


class V2TicketZeroLogCreate(V2TicketZeroLogBase):
    pass


class V2TicketZeroLogResponse(V2TicketZeroLogBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class V2TicketZeroStatusResponse(BaseModel):
    bailout_available: bool


class V2TicketZeroBailoutResponse(BaseModel):
    granted: bool
    ticket_type: TicketType
    ticket_amount: int
