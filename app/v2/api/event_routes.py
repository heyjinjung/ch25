"""Event routes for 2026 Valentine & Seol event.

Endpoints:
  POST /api/events/secret-code/claim — 비밀코드 입력 및 보상 수령
  GET  /api/events/valentine-seol/status — 이벤트 미션 진행 현황
"""

import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.v2.api.deps import get_current_user_id, get_db
from app.v2.models.core.event_secret_code import EventSecretCode, UserSecretCodeClaim
from app.v2.models import Mission, GameTokenType
from app.v2.models.core.mission import UserMissionProgress
from app.v2.services.reward_service import V2RewardService
from app.v2.services.mission_service import V2MissionService
from app.v2.services.inventory_service import V2InventoryService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/events", tags=["events-valentine-seol"])


# ── Schemas ──────────────────────────────────────────────────────────────

class SecretCodeClaimRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=50, description="비밀코드")


class SecretCodeClaimResponse(BaseModel):
    success: bool
    reward_type: str | None = None
    reward_amount: int | None = None
    message: str | None = None


class EventMissionStatus(BaseModel):
    mission_id: int
    title: str
    logic_key: str | None = None
    target_value: int
    current_value: int
    is_completed: bool
    is_claimed: bool
    reward_type: str | None = None
    reward_amount: int | None = None


class EventStatusResponse(BaseModel):
    missions: list[EventMissionStatus]
    streak_completed: bool
    streak_current: int
    streak_target: int
    secret_codes_claimed: list[str]


# ── Secret Code Claim ────────────────────────────────────────────────────

@router.post("/secret-code/claim", response_model=SecretCodeClaimResponse)
def claim_secret_code(
    payload: SecretCodeClaimRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> SecretCodeClaimResponse:
    """비밀코드를 입력하여 보상을 수령합니다.

    - 코드가 존재하지 않거나 만료된 경우 에러
    - 이미 입력한 코드인 경우 에러
    - 성공 시 즉시 보상 지급
    """
    now_kst = datetime.now(ZoneInfo("Asia/Seoul"))

    # 1) 코드 조회
    code_upper = payload.code.strip().upper()
    secret = db.query(EventSecretCode).filter(
        EventSecretCode.code == code_upper,
        EventSecretCode.is_active == True,
    ).first()

    if not secret:
        raise HTTPException(status_code=404, detail="INVALID_CODE")

    # 2) 만료 확인
    expires_at = secret.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=ZoneInfo("Asia/Seoul"))
    if now_kst > expires_at:
        raise HTTPException(status_code=400, detail="CODE_EXPIRED")

    # 3) 중복 입력 확인
    existing_claim = db.query(UserSecretCodeClaim).filter(
        UserSecretCodeClaim.user_id == user_id,
        UserSecretCodeClaim.secret_code_id == secret.id,
    ).first()

    if existing_claim:
        raise HTTPException(status_code=400, detail="ALREADY_CLAIMED")

    # 4) 보상 지급
    reward_type = secret.reward_type
    reward_amount = secret.reward_amount

    _grant_secret_code_reward(
        db,
        user_id=user_id,
        reward_type=reward_type,
        reward_amount=reward_amount,
    )

    # 5) 입력 기록 저장
    claim = UserSecretCodeClaim(
        user_id=user_id,
        secret_code_id=secret.id,
        claimed_at=datetime.utcnow(),
    )
    db.add(claim)
    db.commit()

    logger.info(
        "secret_code claimed: user_id=%s code=%s reward=%s amount=%s",
        user_id, code_upper, reward_type, reward_amount,
    )

    return SecretCodeClaimResponse(
        success=True,
        reward_type=reward_type,
        reward_amount=reward_amount,
        message=f"{reward_type} x{reward_amount} 지급 완료!",
    )


def _grant_secret_code_reward(
    db: Session, *, user_id: int, reward_type: str, reward_amount: int
) -> None:
    """비밀코드 보상을 유형에 따라 지급합니다."""
    reward_service = V2RewardService()

    # 티켓 유형은 grant_ticket으로 직접 지급
    TICKET_TYPE_MAP = {
        "ROULETTE_TICKET": GameTokenType.ROULETTE_TICKET,
        "DICE_TICKET": GameTokenType.DICE_TICKET,
        "LOTTERY_TICKET": GameTokenType.LOTTERY_TICKET,
        "GOLD_KEY_TICKET": GameTokenType.GOLD_KEY_TICKET,
        "GOLD_KEY_FRAGMENT": GameTokenType.GOLD_KEY_TICKET,  # fragment → ticket
        "DIAMOND_TICKET": GameTokenType.DIAMOND_TICKET,
    }

    token_type = TICKET_TYPE_MAP.get(reward_type.upper())
    if token_type:
        reward_service.grant_ticket(
            db,
            user_id=user_id,
            token_type=token_type,
            amount=reward_amount,
            meta={"reason": "SECRET_CODE", "source": "EVENT_SEOL_2026"},
        )
        return

    # POINT → vault_locked_balance
    if reward_type.upper() == "POINT":
        reward_service.deliver(
            db,
            user_id=user_id,
            reward_type="POINT",
            reward_amount=reward_amount,
            meta={"reason": "SECRET_CODE", "source": "EVENT_SEOL_2026"},
        )
        return

    logger.warning("Unknown secret code reward_type: %s", reward_type)


# ── Event Mission Status ─────────────────────────────────────────────────

EVENT_LOGIC_KEYS = [
    "EVENT_VALENTINE_2026",
    "EVENT_SEOL_DAY1_2026",
    "EVENT_SEOL_DAY2_2026",
    "EVENT_SEOL_DAY3_2026",
    "EVENT_SEOL_STREAK_2026",
]


@router.get("/valentine-seol/status", response_model=EventStatusResponse)
def get_valentine_seol_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> EventStatusResponse:
    """발렌타인 & 설날 이벤트 현황을 조회합니다."""
    mission_service = V2MissionService(db)

    # 1) 이벤트 미션 목록
    event_missions = db.query(Mission).filter(
        Mission.logic_key.in_(EVENT_LOGIC_KEYS),
        Mission.is_active == True,
    ).order_by(Mission.start_date.asc()).all()

    missions_out: list[EventMissionStatus] = []
    streak_current = 0
    streak_target = 4
    streak_completed = False

    for m in event_missions:
        reset_date = mission_service._get_reset_date_str(m.category)
        progress = db.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user_id,
            UserMissionProgress.mission_id == m.id,
            UserMissionProgress.reset_date == reset_date,
        ).first()

        current_value = progress.current_value if progress else 0
        is_completed = progress.is_completed if progress else False
        is_claimed = progress.is_claimed if progress else False

        if m.logic_key == "EVENT_SEOL_STREAK_2026":
            streak_current = current_value
            streak_target = m.target_value
            streak_completed = is_completed

        missions_out.append(EventMissionStatus(
            mission_id=m.id,
            title=m.title,
            logic_key=m.logic_key,
            target_value=m.target_value,
            current_value=current_value,
            is_completed=is_completed,
            is_claimed=is_claimed,
            reward_type=m.reward_type,
            reward_amount=m.reward_amount,
        ))

    # 2) 입력한 비밀코드 목록
    claimed_codes = (
        db.query(EventSecretCode.code)
        .join(UserSecretCodeClaim, UserSecretCodeClaim.secret_code_id == EventSecretCode.id)
        .filter(UserSecretCodeClaim.user_id == user_id)
        .all()
    )

    return EventStatusResponse(
        missions=missions_out,
        streak_completed=streak_completed,
        streak_current=streak_current,
        streak_target=streak_target,
        secret_codes_claimed=[c[0] for c in claimed_codes],
    )
