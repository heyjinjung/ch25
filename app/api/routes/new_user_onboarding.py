"""New-user onboarding utilities (Phase 0 instant-action funnel).

Notes:
- /status is used by the Home welcome modal (Policy B: show to all users; hide after claim).
- /claim-welcome provides a single-click welcome grant (vault + ticket).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.models.external_ranking import ExternalRankingData
from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.mission import Mission, MissionCategory, UserMissionProgress
from app.services.mission_service import MissionService

router = APIRouter(prefix="/api/new-user", tags=["new-user"])


WELCOME_LOGIC_KEYS = (
    "NEW_USER_WELCOME_CASH",
    "NEW_USER_WELCOME_TICKET",
    "starter_play_1",
    "starter_play_3",
    "starter_channel_join",
    "starter_attendance",
)


class NewUserMissionInfo(BaseModel):
    id: int
    logic_key: str
    action_type: str | None
    title: str
    description: str | None
    target_value: int
    current_value: int
    is_completed: bool
    is_claimed: bool
    reward_type: str
    reward_amount: int


class NewUserStatusResponse(BaseModel):
    eligible: bool
    reason: str | None = None
    is_new_user_window_active: bool
    window_ends_at_utc: datetime | None = None
    seconds_left: int | None = None

    telegram_linked: bool
    existing_member_by_external_deposit: bool
    deposit_amount: int
    total_play_count: int

    bonus_cap: int
    missions: list[NewUserMissionInfo]


class ClaimWelcomeResponse(BaseModel):
    success: bool
    reason: str | None = None
    rewards: list[dict] = Field(default_factory=list)


def _to_utc_naive(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        # Treat as UTC-naive already.
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


@router.get("/status", response_model=NewUserStatusResponse)
def status(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)) -> NewUserStatusResponse:
    now_utc = datetime.utcnow()

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        return NewUserStatusResponse(
            eligible=False,
            reason="USER_NOT_FOUND",
            is_new_user_window_active=False,
            window_ends_at_utc=None,
            seconds_left=None,
            telegram_linked=False,
            existing_member_by_external_deposit=False,
            deposit_amount=0,
            total_play_count=0,
            bonus_cap=10_000,
            missions=[],
        )

    telegram_linked = bool(getattr(user, "telegram_id", None))

    # [Mission Trigger] Day 2+ login should progress even if the user only hits /api/new-user/status.
    # Logic: if last_login_at was on a previous KST day, increment LOGIN once and update last_login_at.
    try:
        kst = ZoneInfo("Asia/Seoul")
        today_kst_date = datetime.now(kst).date()

        should_increment = False
        if user.last_login_at:
            last_login_utc = user.last_login_at.replace(tzinfo=timezone.utc)
            last_login_kst = last_login_utc.astimezone(kst)
            if last_login_kst.date() < today_kst_date:
                should_increment = True
        else:
            should_increment = True

        if should_increment:
            # Set last_login_at first so downstream endpoints don't double-increment on the same day.
            user.last_login_at = datetime.now(timezone.utc)
            db.add(user)
            MissionService(db).update_progress(user_id, "LOGIN", delta=1)
    except Exception:
        db.rollback()

    # Determine "new user" window from first_login_at (Telegram-native entry) with fallback to created_at.
    created = _to_utc_naive(getattr(user, "first_login_at", None) or getattr(user, "created_at", now_utc))
    window_ends_at = created + timedelta(hours=24)
    seconds_left = max(int((window_ends_at - now_utc).total_seconds()), 0)
    window_active = now_utc < window_ends_at

    activity = db.query(UserActivity).filter(UserActivity.user_id == user_id).first()
    has_charge_history = bool(getattr(activity, "last_charge_at", None))

    ext = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user_id).first()
    deposit_amount = int(getattr(ext, "deposit_amount", 0) or 0)
    existing_member_by_external_deposit = (deposit_amount > 0) or has_charge_history

    total_play_count = int(
        (getattr(activity, "roulette_plays", 0) or 0)
        + (getattr(activity, "dice_plays", 0) or 0)
        + (getattr(activity, "lottery_plays", 0) or 0)
    )

    # 1. Fetch missions for welcome modal (keep legacy NEW_USER missions for ops/debug, but do not expose here)
    ms = MissionService(db)
    missions_raw = (
        db.query(Mission)
        .filter(
            Mission.category == MissionCategory.NEW_USER,
            Mission.is_active == True,
            Mission.logic_key.in_(WELCOME_LOGIC_KEYS),
        )
        .order_by(Mission.id.asc())
        .all()
    )
    
    missions_info = []
    for m in missions_raw:
        # For NEW_USER category, reset_date is 'STATIC'
        progress = db.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user_id,
            UserMissionProgress.mission_id == m.id,
            UserMissionProgress.reset_date == "STATIC"
        ).first()
        
        missions_info.append(NewUserMissionInfo(
            id=m.id,
            logic_key=m.logic_key,
            action_type=m.action_type,
            title=m.title,
            description=m.description,
            target_value=m.target_value,
            current_value=progress.current_value if progress else 0,
            is_completed=progress.is_completed if progress else False,
            is_claimed=progress.is_claimed if progress else False,
            reward_type=m.reward_type,
            reward_amount=m.reward_amount
        ))

    # B) 정책: 이제 eligible은 "대상자 필터링"이 아니라, status가 정상 제공되는지에 대한 필드로만 유지한다.
    # - 모든 로그인 유저에게 웰컴 미션을 노출하고
    # - 4개 미션 완료 전까지 계속 뜨는 UX는 프론트에서 missions 진행도로 제어한다.
    return NewUserStatusResponse(
        eligible=True,
        reason=None if not existing_member_by_external_deposit else "EXTERNAL_DEPOSIT_HISTORY",
        is_new_user_window_active=window_active,
        window_ends_at_utc=window_ends_at,
        seconds_left=seconds_left,
        telegram_linked=telegram_linked,
        existing_member_by_external_deposit=existing_member_by_external_deposit,
        deposit_amount=deposit_amount,
        total_play_count=total_play_count,
        bonus_cap=10_000,
        missions=missions_info,
    )


@router.post("/claim-welcome", response_model=ClaimWelcomeResponse)
def claim_welcome(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)) -> ClaimWelcomeResponse:
    """Single-click welcome claim.

    Idempotent by design:
    - If progress is already completed but not claimed, we attempt to claim.
    - If already claimed, return success.
    """

    ms = MissionService(db)
    rewards: list[dict] = []

    missions = (
        db.query(Mission)
        .filter(Mission.logic_key.in_(WELCOME_LOGIC_KEYS), Mission.is_active == True)
        .all()
    )
    missions_by_key = {m.logic_key: m for m in missions}

    missing = [k for k in WELCOME_LOGIC_KEYS if k not in missions_by_key]
    if missing:
        return ClaimWelcomeResponse(success=False, reason="WELCOME_MISSION_NOT_CONFIGURED", rewards=[])

    for logic_key in WELCOME_LOGIC_KEYS:
        mission = missions_by_key[logic_key]
        reset_date = ms.get_reset_date_str(mission.category)

        progress = (
            db.query(UserMissionProgress)
            .filter(
                UserMissionProgress.user_id == user_id,
                UserMissionProgress.mission_id == mission.id,
                UserMissionProgress.reset_date == reset_date,
            )
            .with_for_update()
            .first()
        )
        if not progress:
            progress = UserMissionProgress(
                user_id=user_id,
                mission_id=mission.id,
                current_value=0,
                reset_date=reset_date,
            )
            db.add(progress)

        # Mark as completed (single-click) if not yet completed.
        if not progress.is_completed:
            progress.current_value = int(mission.target_value or 1)
            progress.is_completed = True
            progress.completed_at = datetime.utcnow()
            db.add(progress)
            db.flush()

        # Ensure claimed when completed.
        if progress.is_completed and not progress.is_claimed:
            try:
                ok, reward_type, amount = ms.claim_reward(user_id, mission.id)
                if ok:
                    rewards.append(
                        {
                            "logic_key": logic_key,
                            "reward_type": reward_type,
                            "amount": int(amount or 0),
                        }
                    )
            except Exception:
                # Do not fail the whole claim; keep idempotent behavior.
                db.rollback()
                return ClaimWelcomeResponse(success=False, reason="CLAIM_FAILED", rewards=rewards)

    return ClaimWelcomeResponse(success=True, reason=None, rewards=rewards)
