# /workspace/ch25/app/schemas/admin_feature_schedule.py
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.feature import FeatureType


class AdminFeatureScheduleBase(BaseModel):
    date: date
    feature_type: FeatureType
    season_id: Optional[int] = None
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class AdminFeatureScheduleCreate(AdminFeatureScheduleBase):
    pass


class AdminFeatureScheduleUpdate(BaseModel):
    feature_type: Optional[FeatureType] = None
    season_id: Optional[int] = None
    is_active: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class AdminFeatureScheduleResponse(AdminFeatureScheduleBase):
    id: int
    created_at: Optional[str]
    updated_at: Optional[str]
