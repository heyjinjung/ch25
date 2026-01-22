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

    # Single-SoT rollout explicit amounts
    vault_amount_total: int = 0
    vault_amount_reserved: int = 0
    vault_amount_available: int = 0

    ticket_count: int = 0
    vault_fill_used_at: datetime | None = None

    seeded: bool = False
    
    # VIP
    total_charge_amount: int = 0
    segment: str | None = None

    # Withdrawal Conditions
    daily_play_count: int = 0
    daily_play_target: int = 30
    daily_deposit_confirmed: bool = False
    daily_vault_spent: int = 0
    daily_vault_spent_target: int = 10000
    withdrawal_count: int = 0

    # Phase 1 UX integration (optional)
    recommended_action: str | None = None
    cta_payload: dict[str, Any] | None = None

    # Phase 2/3 rollout helpers (optional, for rule-driven UI)
    program_key: str | None = None
    unlock_rules_json: dict[str, Any] | None = None

    # Event flags (optional)
    accrual_multiplier: float | None = None
    ui_copy_json: dict[str, Any] | None = None

    # Golden Hour
    is_golden_hour_active: bool = False
    golden_hour_remaining_seconds: int = 0
    golden_hour_multiplier: float = 1.0

    # Global Modal Overrides (Admin controlled)
    show_modal_override: str | None = None

    # Strict Vault Policy (Phase 2)
    deposit_status: str = "ACTIVE"  # ACTIVE, WARNING, INACTIVE
    vault_max_limit: int = 0  # 0 means no limit (or default cap), 30000 for zero-deposit
    benefits_suspended: bool = False
    balances: dict[str, int] = {}

    # Withdrawal Conditions (Phase 2)
    daily_play_count: int = 0
    daily_play_target: int = 30
    daily_vault_spent: int = 0
    daily_vault_spent_target: int = 10000
    daily_deposit_confirmed: bool = False


class VaultFillResponse(BaseModel):
    eligible: bool
    delta: int
    vault_balance_after: int
    vault_fill_used_at: datetime


class VaultEarnEventSchema(BaseModel):
    id: int
    user_id: int
    earn_event_id: str
    earn_type: str
    amount: int
    source: str
    reward_kind: str | None = None
    game_type: str | None = None
    token_type: str | None = None
    payout_raw_json: dict[str, Any] | None = None
    created_at: datetime
    
    class Config:
        from_attributes = True
