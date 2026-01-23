from typing import List
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.models.mission import Mission, MissionRewardType

from app.v2.services.v2_admin_mission_service import V2AdminMissionService
from app.v2.services import V2AdminAuditService


class AdminMissionDto(BaseModel):
    id: int
    category: str
    title: str
    condition: str
    targetValue: int
    logicKey: str
    rewardType: str
    rewardAmount: int
    isActive: bool


class AdminMissionUpdateRequest(BaseModel):
    category: str | None = None
    title: str | None = None
    condition: str | None = None
    targetValue: int | None = None
    logicKey: str | None = None
    rewardType: str | None = None
    rewardAmount: int | None = None
    isActive: bool | None = None


class AdminMissionCreateRequest(BaseModel):
    category: str
    title: str
    condition: str | None = None
    targetValue: int
    logicKey: str
    rewardType: str
    rewardAmount: int
    isActive: bool | None = True


def _normalize_mission_category(value: str) -> str:
    raw = str(value or "").strip().upper()
    if raw == "SPECIAL_EVENT":
        return "SPECIAL"
    return raw


def _normalize_mission_reward_type(value: str) -> MissionRewardType:
    reward_type_raw = str(value or "").strip().upper()
    legacy_map = {
        "ROULETTE_TICKET": "TICKET_ROULETTE",
        "DICE_TICKET": "TICKET_DICE",
        "LOTTERY_TICKET": "TICKET_LOTTERY",
    }
    reward_type_norm = legacy_map.get(reward_type_raw, reward_type_raw)
    try:
        return MissionRewardType(reward_type_norm)
    except Exception:
        raise HTTPException(status_code=400, detail="INVALID_REWARD_TYPE")


@router.get("/game/missions", response_model=List[AdminMissionDto])
def get_admin_missions(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    missions = V2AdminMissionService.list_missions(db)

    result = []
    for m in missions:
        result.append(
            AdminMissionDto(
                id=m.id,
                category=m.category.value if hasattr(m.category, "value") else str(m.category),
                title=m.title,
                condition=m.description or f"Target: {m.target_value}",
                targetValue=m.target_value,
                logicKey=m.logic_key,
                rewardType=str(m.reward_type.value if hasattr(m.reward_type, "value") else m.reward_type),
                rewardAmount=m.reward_amount,
                isActive=m.is_active,
            )
        )
    return result


@router.post("/game/missions")
def create_admin_mission(
    payload: AdminMissionCreateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    category_raw = _normalize_mission_category(payload.category)
    try:
        category_enum = Mission.category.type.enum_class(category_raw)
    except Exception:
        raise HTTPException(status_code=400, detail="INVALID_CATEGORY")

    # Duplicate check in service or route? Move to service ideally but keep it here for now if needed.
    if db.query(Mission).filter(Mission.logic_key == payload.logicKey).first():
        raise HTTPException(status_code=400, detail="DUPLICATE_LOGIC_KEY")

    reward_type = _normalize_mission_reward_type(payload.rewardType)

    data = {
        "title": payload.title,
        "description": payload.condition or f"Target: {payload.targetValue}",
        "category": category_enum,
        "logic_key": payload.logicKey,
        "target_value": int(payload.targetValue),
        "reward_type": reward_type,
        "reward_amount": int(payload.rewardAmount),
        "is_active": bool(payload.isActive),
    }
    
    mission = V2AdminMissionService.create_mission(db, data)
    V2AdminAuditService.log(
        db, admin_id, "MISSION_CREATE", "MISSION", str(mission.id),
        after=data
    )
    return {"success": True, "id": mission.id}


@router.put("/game/missions/{mission_id}")
def update_admin_mission(
    mission_id: int,
    payload: AdminMissionUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info
    m = V2AdminMissionService.get_mission(db, mission_id)
    
    patch = {}
    if payload.category is not None:
        category_raw = _normalize_mission_category(payload.category)
        try:
            patch["category"] = Mission.category.type.enum_class(category_raw)
        except Exception:
            raise HTTPException(status_code=400, detail="INVALID_CATEGORY")

    if payload.title is not None: patch["title"] = payload.title
    if payload.condition is not None: patch["description"] = payload.condition
    if payload.logicKey is not None: patch["logic_key"] = payload.logicKey
    if payload.targetValue is not None: patch["target_value"] = payload.targetValue
    if payload.rewardType is not None: patch["reward_type"] = _normalize_mission_reward_type(payload.rewardType)
    if payload.rewardAmount is not None: patch["reward_amount"] = payload.rewardAmount
    if payload.isActive is not None: patch["is_active"] = payload.isActive

    V2AdminMissionService.update_mission(db, mission_id, patch)
    V2AdminAuditService.log(
        db, admin_id, "MISSION_UPDATE", "MISSION", str(mission_id),
        after=patch
    )
    return {"success": True}


@router.delete("/game/missions/{mission_id}")
def delete_admin_mission(
    mission_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    V2AdminMissionService.delete_mission(db, mission_id)
    V2AdminAuditService.log(
        db, admin_id, "MISSION_DELETE", "MISSION", str(mission_id)
    )
    return {"success": True}
