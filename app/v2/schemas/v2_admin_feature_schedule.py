"""V2 Admin Feature Schedule Schema."""
from datetime import date
from typing import Optional

from pydantic import ConfigDict

from app.schemas.base import KstBaseModel as BaseModel
from app.v2.models import FeatureType


class AdminFeatureScheduleBase(BaseModel):
    date: date
    feature_type: FeatureType
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class AdminFeatureScheduleCreate(AdminFeatureScheduleBase):
    pass


class AdminFeatureScheduleUpdate(BaseModel):
    feature_type: Optional[FeatureType] = None
    is_active: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class AdminFeatureScheduleResponse(AdminFeatureScheduleBase):
    id: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
