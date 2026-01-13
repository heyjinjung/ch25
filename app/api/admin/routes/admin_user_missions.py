from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.api.deps import get_db
from app.models.mission import Mission, UserMissionProgress, MissionCategory
from app.services.mission_service import MissionService
from app.services.admin_user_identity_service import resolve_user_id_by_identifier
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
            category=getattr(m.category, "value", str(m.category)),
            target_value=m.target_value,
            current_value=progress.current_value if progress else 0,
            is_completed=progress.is_completed if progress else False,
            is_claimed=progress.is_claimed if progress else False,
            approval_status=progress.approval_status if progress else "NONE",
            reset_date=reset_date
        ))
    
    return results


@router.get("/by-identifier/{identifier}", response_model=List[AdminUserMissionDetail])
@router.get("/by-identifier/{identifier}/", response_model=List[AdminUserMissionDetail])
def get_user_missions_progress_by_identifier(
    identifier: str,
    db: Session = Depends(get_db),
):
    user_id = resolve_user_id_by_identifier(db, identifier)
    return get_user_missions_progress(user_id=user_id, db=db)

@router.put("/{user_id}/{mission_id}")
def update_user_mission_progress(
    user_id: int, 
    mission_id: int, 
    payload: AdminUserMissionProgressUpdate, 
    db: Session = Depends(get_db),
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


@router.put("/by-identifier/{identifier}/{mission_id}")
@router.put("/by-identifier/{identifier}/{mission_id}/")
def update_user_mission_progress_by_identifier(
    identifier: str,
    mission_id: int,
    payload: AdminUserMissionProgressUpdate,
    db: Session = Depends(get_db),
):
    user_id = resolve_user_id_by_identifier(db, identifier)
    return update_user_mission_progress(user_id=user_id, mission_id=mission_id, payload=payload, db=db)


class AdminMissionApprovalDetail(BaseModel):
    id: int
    user_id: int
    nickname: Optional[str]
    telegram_id: Optional[str]
    mission_id: int
    mission_title: str
    current_value: int
    target_value: int
    completed_at: Optional[datetime]
    approval_status: str


@router.get("/approvals/queue", response_model=List[AdminMissionApprovalDetail])
def get_mission_approval_queue(db: Session = Depends(get_db)):
    """Fetch all mission progress records that are waiting for approval."""
    from app.models.user import User
    
    rows = db.query(
        UserMissionProgress.id,
        UserMissionProgress.user_id,
        User.nickname,
        User.telegram_id,
        UserMissionProgress.mission_id,
        Mission.title,
        UserMissionProgress.current_value,
        Mission.target_value,
        UserMissionProgress.completed_at,
        UserMissionProgress.approval_status
    ).join(User, User.id == UserMissionProgress.user_id) \
     .join(Mission, Mission.id == UserMissionProgress.mission_id) \
     .filter(UserMissionProgress.approval_status == "PENDING") \
     .order_by(UserMissionProgress.completed_at.asc()) \
     .all()
     
    return [
        AdminMissionApprovalDetail(
            id=r[0],
            user_id=r[1],
            nickname=r[2],
            telegram_id=str(r[3]) if r[3] else None,
            mission_id=r[4],
            mission_title=r[5],
            current_value=r[6],
            target_value=r[7],
            completed_at=r[8],
            approval_status=str(r[9]) if hasattr(r[9], "value") else str(r[9])
        ) for r in rows
    ]


class BatchApprovalRequest(BaseModel):
    ids: List[int]
    status: str # APPROVED | REJECTED


@router.post("/approvals/batch")
def batch_update_mission_status(payload: BatchApprovalRequest, db: Session = Depends(get_db)):
    """Approve or reject a batch of mission progress records."""
    if payload.status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    db.query(UserMissionProgress).filter(
        UserMissionProgress.id.in_(payload.ids)
    ).update({"approval_status": payload.status}, synchronize_session=False)
    
    db.commit()
    return {"success": True, "count": len(payload.ids)}
