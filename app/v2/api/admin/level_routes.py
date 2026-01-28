from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.models.v2_level_reward import V2LevelRewardTable
from app.v2.services.admin_audit_service import V2AdminAuditService

router = APIRouter()

ALLOWED_REWARD_TYPES = {
    "POINT",
    "CC_POINT",
    "GAME_XP",
    "DIAMOND",
    "TICKET",
    "BUNDLE",
    "TICKET_BUNDLE",
    "NONE",
    "ROULETTE_TICKET",
    "DICE_TICKET",
    "LOTTERY_TICKET",
    "GOLD_KEY_TICKET",
    "DIAMOND_TICKET",
    "GOLD_KEY_FRAGMENT",
    "DIAMOND_FRAGMENT",
    "PUZZLE_C1",
    "PUZZLE_C2",
    "PUZZLE_J",
    "PUZZLE_M",
    "TRIAL_TICKET",
}


def _normalize_reward_type(value: str | None) -> str:
    if not value:
        return "NONE"
    return value.upper()


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
        sot_data = [
            (1, 0, "ROULETTE_TICKET", 1),
            (2, 20, "DICE_TICKET", 1),
            (3, 50, "ROULETTE_TICKET", 1),
            (4, 60, "LOTTERY_TICKET", 1),
            (5, 100, "DICE_TICKET", 1),
            (6, 120, "GIFTICON_BAEMIN_5000", 5000),
            (7, 160, "DICE_TICKET", 2),
            (8, 200, "DICE_TICKET", 3),
            (9, 300, "LOTTERY_TICKET", 1),
            (10, 500, "GOLD_KEY_TICKET", 1),
            (11, 700, "ROULETTE_TICKET", 3),
            (12, 1000, "GOLD_KEY_TICKET", 1),
            (13, 1200, "DICE_TICKET", 4),
            (14, 1400, "ROULETTE_TICKET", 4),
            (15, 1800, "LOTTERY_TICKET", 3),
            (16, 2200, "LOTTERY_TICKET", 5),
            (17, 3000, "GOLD_KEY_TICKET", 3),
            (18, 4000, "DIAMOND_TICKET", 1),
            (19, 5000, "DIAMOND_TICKET", 2),
            (20, 6000, "DIAMOND_TICKET", 5),
        ]
        levels = []
        for lv, xp, r_type, r_amount in sot_data:
            new_level = V2LevelRewardTable(
                level=lv,
                required_xp=xp,
                reward_type=r_type,
                reward_amount=r_amount,
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

    V2AdminAuditService.log(
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
        normalized = _normalize_reward_type(payload.rewardType)
        if not (normalized in ALLOWED_REWARD_TYPES or normalized.startswith("GIFTICON_")):
            raise HTTPException(status_code=400, detail="INVALID_REWARD_TYPE")
        lvl.reward_type = normalized

    if payload.rewardAmount is not None:
        lvl.reward_amount = payload.rewardAmount

    lvl.reward_payload = None

    db.commit()
    db.refresh(lvl)

    return AdminLevelDto(
        level=lvl.level,
        requiredXp=lvl.required_xp,
        rewardType=lvl.reward_type,
        rewardAmount=lvl.reward_amount,
        rewardTicket=lvl.reward_amount if "TICKET" in lvl.reward_type else 0,
        rewardPoint=lvl.reward_amount if lvl.reward_type == "POINT" else 0,
    )
