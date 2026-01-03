"""Vault 2.0 scaffold schemas.

These are read-only outputs for safe incremental rollout.
"""

from datetime import datetime

from app.schemas.base import KstBaseModel as BaseModel


class VaultProgramResponse(BaseModel):
    key: str
    name: str
    duration_hours: int
    expire_policy: str | None = None
    is_active: bool | None = None
    unlock_rules_json: dict | None = None
    ui_copy_json: dict | None = None
    config_json: dict | None = None


class VaultProgramUnlockRulesUpsertRequest(BaseModel):
    unlock_rules_json: dict | None = None



class VaultProgramUiCopyUpsertRequest(BaseModel):
    ui_copy_json: dict | None = None


class VaultProgramConfigUpsertRequest(BaseModel):
    config_json: dict | None = None


class VaultEligibilityRequest(BaseModel):
    eligible: bool


class VaultEligibilityResponse(BaseModel):
    user_id: int
    eligible: bool


class VaultGameEarnToggleRequest(BaseModel):
    enabled: bool


class VaultTimerActionRequest(BaseModel):
    action: str  # reset | expire_now | start_now


class VaultTimerState(BaseModel):
    user_id: int
    locked_balance: int
    locked_expires_at: datetime | None = None


class VaultAdminStateResponse(BaseModel):
    user_id: int
    eligible: bool
    vault_balance: int
    locked_balance: int
    available_balance: int
    expires_at: datetime | None = None
    locked_expires_at: datetime | None = None
    accrual_multiplier: float | None = None
    program_key: str | None = None
    total_charge_amount: int = 0



class VaultTopItem(BaseModel):
    user_id: int
    program_key: str
    state: str
    locked_amount: int
    available_amount: int = 0
    expires_at: datetime | None = None
    progress_json: dict | None = None


class VaultBalanceUpdateRequest(BaseModel):
    locked_delta: int = 0
    available_delta: int = 0
    reason: str | None = "ADMIN_MANUAL_ADJUST"


class VaultBalanceSetRequest(BaseModel):
    locked_amount: int | None = None
    available_amount: int | None = None
    reason: str | None = "ADMIN_MANUAL_ADJUST"


class VaultGlobalActiveRequest(BaseModel):
    is_active: bool


class VaultDetailItem(BaseModel):
    user_id: int
    external_id: str | None = None
    nickname: str | None = None
    amount: int
    count: int = 1
    timestamp: datetime | None = None
    meta: dict | None = None


class VaultDetailStatsResponse(BaseModel):
    items: list[VaultDetailItem]
