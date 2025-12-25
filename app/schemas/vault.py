"""Schemas for vault (Phase 1 + compatibility) APIs."""

from datetime import datetime
from typing import Any

from app.schemas.base import KstBaseModel as BaseModel


class VaultStatusResponse(BaseModel):
    eligible: bool

    # Legacy UI compatibility (mirror of locked balance)
    vault_balance: int

    # Phase 1 fields (source of truth)
    locked_balance: int = 0
    available_balance: int = 0
    expires_at: datetime | None = None

    cash_balance: int
    vault_fill_used_at: datetime | None = None

    seeded: bool = False

    # Phase 1 UX integration (optional)
    recommended_action: str | None = None
    cta_payload: dict[str, Any] | None = None

    # Phase 2/3 rollout helpers (optional, for rule-driven UI)
    program_key: str | None = None
    unlock_rules_json: dict[str, Any] | None = None

    # Event flags (optional)
    accrual_multiplier: float | None = None
    ui_copy_json: dict[str, Any] | None = None


class VaultFillResponse(BaseModel):
    eligible: bool
    delta: int
    vault_balance_after: int
    vault_fill_used_at: datetime
