from datetime import datetime
from typing import Optional

from pydantic import ConfigDict

from app.schemas.base import KstBaseModel as BaseModel


class UserIdentityHistoryResponse(BaseModel):
    id: int
    user_id: int
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_by: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
