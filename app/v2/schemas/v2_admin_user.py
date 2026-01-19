"""V2 admin user schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import ConfigDict

from app.schemas.base import KstBaseModel as BaseModel


class AdminUserDetailDto(BaseModel):
    id: int
    nickname: str | None
    telegram_id: int | None
    created_at: datetime
    
    # Economy
    total_deposit: int = 0
    current_assets: int = 0
    vault_balance: int = 0
    ticket_balance: int = 0
    
    # Status
    level: int = 1
    vip_level: str = "COMMON"
    is_active: bool = True
    
    # Risk
    risk_level: str = "LOW" # LOW, MEDIUM, HIGH
    risk_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
