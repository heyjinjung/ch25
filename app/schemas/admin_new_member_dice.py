"""Admin schemas for managing new-member dice eligibility."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AdminNewMemberDiceEligibilityCreate(BaseModel):
    user_id: int = Field(..., ge=1)
    is_eligible: bool = True
    campaign_key: Optional[str] = Field(None, max_length=50)
    granted_by: Optional[str] = Field(None, max_length=100)
    expires_at: Optional[datetime] = None


class AdminNewMemberDiceEligibilityUpdate(BaseModel):
    is_eligible: Optional[bool] = None
    campaign_key: Optional[str] = Field(None, max_length=50)
    granted_by: Optional[str] = Field(None, max_length=100)
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None


class AdminNewMemberDiceEligibilityResponse(BaseModel):
    id: int
    user_id: int
    is_eligible: bool
    campaign_key: Optional[str]
    granted_by: Optional[str]
    expires_at: Optional[datetime]
    revoked_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
