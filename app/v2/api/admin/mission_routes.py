from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.models.mission import Mission

router = APIRouter()


class AdminMissionDto(BaseModel):
    id: int
    category: str
    title: str
    condition: str
    rewardType: str
    rewardAmount: int
    isActive: bool


class AdminMissionUpdateRequest(BaseModel):
    rewardType: str | None = None
    rewardAmount: int | None = None
    isActive: bool | None = None


@router.get("/game/missions", response_model=List[AdminMissionDto])
def get_admin_missions(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    missions = db.query(Mission).order_by(Mission.id).all()

    result = []
    for m in missions:
        result.append(
            AdminMissionDto(
                id=m.id,
                category=m.category.value if hasattr(m.category, "value") else str(m.category),
                title=m.title,
                condition=m.description or f"Target: {m.target_value}",
                rewardType=str(m.reward_type.value if hasattr(m.reward_type, "value") else m.reward_type),
                rewardAmount=m.reward_amount,
                isActive=m.is_active,
            )
        )
    return result


@router.put("/game/missions/{mission_id}")
def update_admin_mission(
    mission_id: int,
    payload: AdminMissionUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    m = db.query(Mission).filter(Mission.id == mission_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="MISSION_NOT_FOUND")

    if payload.rewardType is not None:
        m.reward_type = payload.rewardType

    if payload.rewardAmount is not None:
        m.reward_amount = payload.rewardAmount
    if payload.isActive is not None:
        m.is_active = payload.isActive

    db.commit()
    return {"success": True}
