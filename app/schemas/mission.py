from typing import Optional

from pydantic import ConfigDict

from app.schemas.base import KstBaseModel as BaseModel

class MissionSchema(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category: str
    logic_key: str
    action_type: Optional[str] = None
    target_value: int
    reward_type: str
    reward_amount: int
    xp_reward: int = 0
    requires_approval: bool = False
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    auto_claim: bool = False
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)

class MissionProgressSchema(BaseModel):
    current_value: int
    is_completed: bool
    is_claimed: bool
    approval_status: str = "NONE"

class MissionWithProgress(BaseModel):
    mission: MissionSchema
    progress: MissionProgressSchema


class StreakInfoSchema(BaseModel):
    streak_days: int
    current_multiplier: float
    is_hot: bool
    is_legend: bool
    next_milestone: int


class MissionListResponse(BaseModel):
    missions: list[MissionWithProgress]
    streak_info: StreakInfoSchema

class MissionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    logic_key: str
    action_type: Optional[str] = None
    target_value: int
    reward_type: str
    reward_amount: int
    xp_reward: int = 0
    requires_approval: bool = False
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    auto_claim: bool = False
    is_active: bool = True

class MissionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    logic_key: Optional[str] = None
    action_type: Optional[str] = None
    target_value: Optional[int] = None
    reward_type: Optional[str] = None
    reward_amount: Optional[int] = None
    xp_reward: Optional[int] = None
    requires_approval: Optional[bool] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    auto_claim: Optional[bool] = None
    is_active: Optional[bool] = None
