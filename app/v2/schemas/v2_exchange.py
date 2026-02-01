"""V2 Exchange Schema."""
from app.schemas.base import KstBaseModel as BaseModel
from app.v2.models import GameTokenType

class CraftRequest(BaseModel):
    target_token_type: str  # e.g. "GOLD_KEY", "DIAMOND_KEY"

class CraftResponse(BaseModel):
    result: str = "OK"
    reward_token: str
    reward_amount: int
    used_token: str
    used_amount: int
