from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.models.v2_level_reward import V2LevelRewardTable
from app.services.admin_audit_service import AdminAuditService

router = APIRouter()


class AdminLevelDto(BaseModel):
    level: int
    requiredXp: int
    rewardType: str
    rewardAmount: int
    rewardTicket: int | None = None
    rewardPoint: int | None = None


class AdminLevelUpdateRequest(BaseModel):
    requiredXp: int | None = None
    rewardType: str | None = None
    rewardAmount: int | None = None


class AdminLevelGlobalConfigRequest(BaseModel):
    maxLevel: int
    maxXp: int


@router.get("/game/levels", response_model=list[AdminLevelDto])
def get_admin_levels(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    levels = db.query(V2LevelRewardTable).order_by(V2LevelRewardTable.level).all()

    if not levels:
        levels = []
        for i in range(1, 21):
            new_level = V2LevelRewardTable(
                level=i,
                required_xp=i * 1000,
                reward_type="TICKET" if i % 5 == 0 else "POINT",
                reward_amount=(i // 5 + 1) if i % 5 == 0 else i * 100,
            )
            db.add(new_level)
            levels.append(new_level)
        db.commit()

    result = []
    for l in levels:
        result.append(
            AdminLevelDto(
                level=l.level,
                requiredXp=l.required_xp,
                rewardType=l.reward_type,
                rewardAmount=l.reward_amount,
                rewardTicket=l.reward_amount if "TICKET" in l.reward_type else 0,
                rewardPoint=l.reward_amount if l.reward_type == "POINT" else 0,
            )
        )
    return result


@router.put("/game/levels/config")
def update_admin_level_global_config(
    payload: AdminLevelGlobalConfigRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    current_levels = db.query(V2LevelRewardTable).order_by(V2LevelRewardTable.level).all()
    current_max = len(current_levels)

    if payload.maxLevel > current_max:
        for i in range(current_max + 1, payload.maxLevel + 1):
            prev_xp = current_levels[-1].required_xp if current_levels else 0
            new_level = V2LevelRewardTable(
                level=i,
                required_xp=prev_xp + 1000,
                reward_type="POINT",
                reward_amount=100,
            )
            db.add(new_level)
    elif payload.maxLevel < current_max:
        db.query(V2LevelRewardTable).filter(V2LevelRewardTable.level > payload.maxLevel).delete()

    db.flush()

    last_level = (
        db.query(V2LevelRewardTable)
        .filter(V2LevelRewardTable.level == payload.maxLevel)
        .first()
    )
    if last_level:
        last_level.required_xp = payload.maxXp

    db.commit()

    AdminAuditService.log(
        db,
        admin_id,
        "LEVEL_CONFIG_GLOBAL_UPDATE",
        "GAME_CONFIG",
        "GLOBAL",
        before={"max_level": current_max},
        after={"max_level": payload.maxLevel, "max_xp": payload.maxXp},
    )

    return {"success": True}


@router.put("/game/levels/{level}")
def update_admin_level(
    level: int,
    payload: AdminLevelUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    lvl = db.query(V2LevelRewardTable).filter(V2LevelRewardTable.level == level).first()
    if not lvl:
        raise HTTPException(status_code=404, detail="LEVEL_NOT_FOUND")

    if payload.requiredXp is not None:
        lvl.required_xp = payload.requiredXp

    if payload.rewardType is not None:
        lvl.reward_type = payload.rewardType

    if payload.rewardAmount is not None:
        lvl.reward_amount = payload.rewardAmount

    lvl.reward_payload = None

    return AdminLevelDto(
        level=lvl.level,
        requiredXp=lvl.required_xp,
        rewardType=lvl.reward_type,
        rewardAmount=lvl.reward_amount,
        rewardTicket=lvl.reward_amount if "TICKET" in lvl.reward_type else 0,
        rewardPoint=lvl.reward_amount if lvl.reward_type == "POINT" else 0,
    )
