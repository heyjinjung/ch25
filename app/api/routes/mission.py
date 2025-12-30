from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.models.user import User
from app.services.mission_service import MissionService

router = APIRouter()

@router.get("/", response_model=List[dict]) 
# Note: In production, better to use a Pydantic schema for response_model
def read_missions(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get all daily missions and current user progress.
    """
    service = MissionService(db)
    missions = service.get_user_missions(current_user.id)
    return missions

@router.post("/{mission_id}/claim")
def claim_mission_reward(
    mission_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Claim reward for a completed mission.
    """
    service = MissionService(db)
    success, reward_type, amount = service.claim_reward(current_user.id, mission_id)
    
    if not success:
        # In a real app, distinguish between 'not found' vs 'not completed' vs 'already claimed'
        # for proper HTTP codes. Here we use 400 broadly for simplicity.
        raise HTTPException(status_code=400, detail=reward_type) # detail contains error msg
    
    return {
        "success": True, 
        "reward_type": reward_type, 
        "amount": amount
    }
