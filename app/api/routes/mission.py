from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.models.user import User
from app.services.mission_service import MissionService
from app.schemas.mission import MissionWithProgress

# /workspace/ch25/app/api/routes/mission.py
router = APIRouter(prefix="/api/mission", tags=["mission"])

@router.get("/", response_model=List[MissionWithProgress]) 
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

@router.post("/daily-gift")
def claim_daily_gift(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Claim the immediate daily login gift.
    """
    service = MissionService(db)
    success, reward_type, amount = service.claim_daily_gift(current_user.id)
    
    if not success:
        raise HTTPException(status_code=400, detail=reward_type)
    
    return {
        "success": True, 
        "reward_type": reward_type, 
        "amount": amount
    }
