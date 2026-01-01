from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.api.deps import get_db, get_current_admin_id
from app.models.mission import Mission, UserMissionProgress, MissionCategory
from app.services.mission_service import MissionService
from pydantic import BaseModel

router = APIRouter(prefix="/admin/api/user-missions", tags=["admin-user-missions"])

class AdminUserMissionProgressUpdate(BaseModel):
    current_value: Optional[int] = None
    is_completed: Optional[bool] = None
    is_claimed: Optional[bool] = None
    approval_status: Optional[str] = None

class AdminUserMissionDetail(BaseModel):
    mission_id: int
    title: str
    logic_key: str
    category: str
    target_value: int
    
    # Progress fields
    current_value: int
    is_completed: bool
    is_claimed: bool
    approval_status: str
    reset_date: str

@router.get("/{user_id}", response_model=List[AdminUserMissionDetail])
def get_user_missions_progress(
    user_id: int, 
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id)
):
    """Fetch all active missions and the progress for a specific user."""
    missions = db.query(Mission).filter(Mission.is_active == True).all()
    ms = MissionService(db)
    
    results = []
    for m in missions:
        reset_date = ms.get_reset_date_str(m.category)
        
        progress = db.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user_id,
            UserMissionProgress.mission_id == m.id,
            UserMissionProgress.reset_date == reset_date
        ).first()
        
        results.append(AdminUserMissionDetail(
            mission_id=m.id,
            title=m.title,
            logic_key=m.logic_key,
            category=m.category,
            target_value=m.target_value,
            current_value=progress.current_value if progress else 0,
            is_completed=progress.is_completed if progress else False,
            is_claimed=progress.is_claimed if progress else False,
            approval_status=progress.approval_status if progress else "NONE",
            reset_date=reset_date
        ))
    
    return results

@router.put("/{user_id}/{mission_id}")
def update_user_mission_progress(
    user_id: int, 
    mission_id: int, 
    payload: AdminUserMissionProgressUpdate, 
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id)
):
    """Upsert or update mission progress for a user."""
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    ms = MissionService(db)
    reset_date = ms.get_reset_date_str(mission.category)
    
    progress = db.query(UserMissionProgress).filter(
        UserMissionProgress.user_id == user_id,
        UserMissionProgress.mission_id == mission_id,
        UserMissionProgress.reset_date == reset_date
    ).first()
    
    if not progress:
        progress = UserMissionProgress(
            user_id=user_id,
            mission_id=mission_id,
            reset_date=reset_date,
            current_value=0
        )
        db.add(progress)
    
    if payload.current_value is not None:
        progress.current_value = payload.current_value
    if payload.is_completed is not None:
        progress.is_completed = payload.is_completed
        if progress.is_completed and not progress.completed_at:
            progress.completed_at = datetime.utcnow()
    if payload.is_claimed is not None:
        progress.is_claimed = payload.is_claimed
    if payload.approval_status is not None:
        progress.approval_status = payload.approval_status
        
    db.commit()
    return {"success": True}
