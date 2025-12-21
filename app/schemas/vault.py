"""Schemas for vault (locked balance) APIs."""

from datetime import datetime
from app.schemas.base import KstBaseModel as BaseModel


class VaultStatusResponse(BaseModel):
    eligible: bool
    vault_balance: int
    cash_balance: int
    vault_fill_used_at: datetime | None = None

    seeded: bool = False
    expires_at: datetime | None = None


class VaultFillResponse(BaseModel):
    eligible: bool
    delta: int
    vault_balance_after: int
    vault_fill_used_at: datetime
