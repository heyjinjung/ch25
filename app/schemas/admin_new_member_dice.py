"""Admin schemas for managing new-member dice eligibility."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AdminNewMemberDiceEligibilityCreate(BaseModel):
    user_id: Optional[int] = Field(None, ge=1)
    external_id: Optional[str] = Field(None, max_length=100)
    is_eligible: bool = True
    campaign_key: Optional[str] = Field(None, max_length=50)
    granted_by: Optional[str] = Field(None, max_length=100)
    expires_at: Optional[datetime] = None

    @model_validator(mode="after")
    def _validate_identifier(self):
        if self.user_id is None and (self.external_id is None or not self.external_id.strip()):
            raise ValueError("user_id 또는 external_id 중 하나는 필수입니다.")
        if self.external_id is not None:
            self.external_id = self.external_id.strip() or None
        return self


class AdminNewMemberDiceEligibilityUpdate(BaseModel):
    is_eligible: Optional[bool] = None
    campaign_key: Optional[str] = Field(None, max_length=50)
    granted_by: Optional[str] = Field(None, max_length=100)
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None


class AdminNewMemberDiceEligibilityResponse(BaseModel):
    id: int
    user_id: int
    external_id: Optional[str] = None
    nickname: Optional[str] = None
    is_eligible: bool
    campaign_key: Optional[str]
    granted_by: Optional[str]
    expires_at: Optional[datetime]
    revoked_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
