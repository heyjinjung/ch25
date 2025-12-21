"""Vault 2.0 scaffold schemas.

These are read-only outputs for safe incremental rollout.
"""

from datetime import datetime

from app.schemas.base import KstBaseModel as BaseModel


class VaultProgramResponse(BaseModel):
    key: str
    name: str
    duration_hours: int


class VaultTopItem(BaseModel):
    user_id: int
    program_key: str
    state: str
    locked_amount: int
    expires_at: datetime | None = None
