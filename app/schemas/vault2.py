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


class VaultTopItem(BaseModel):
    user_id: int
    program_key: str
    state: str
    locked_amount: int
    available_amount: int = 0
    expires_at: datetime | None = None
    progress_json: dict | None = None
