"""New-user onboarding utilities (Phase 0 instant-action funnel).

This router is intentionally read-only for now:
- It helps the frontend render a separate onboarding page only for new users.
- It exposes coarse progress signals derived from existing tables.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.models.external_ranking import ExternalRankingData
from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.mission import Mission, MissionCategory, UserMissionProgress
from app.services.mission_service import MissionService

router = APIRouter(prefix="/api/new-user", tags=["new-user"])


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

    # 1. Fetch missions in NEW_USER category
    ms = MissionService(db)
    missions_raw = db.query(Mission).filter(Mission.category == MissionCategory.NEW_USER, Mission.is_active == True).all()
    
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
