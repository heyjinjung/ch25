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

router = APIRouter(prefix="/api/new-user", tags=["new-user"])


class NewUserProgress(BaseModel):
    deposit_confirmed: bool
    play_1: bool
    play_3: bool
    share_or_join: bool
    next_day_login: bool


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
    progress: NewUserProgress


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
            progress=NewUserProgress(
                deposit_confirmed=False,
                play_1=False,
                play_3=False,
                share_or_join=False,
                next_day_login=False,
            ),
        )

    telegram_linked = bool(getattr(user, "telegram_id", None))
    if not telegram_linked:
        return NewUserStatusResponse(
            eligible=False,
            reason="TELEGRAM_NOT_LINKED",
            is_new_user_window_active=False,
            window_ends_at_utc=None,
            seconds_left=None,
            telegram_linked=False,
            existing_member_by_external_deposit=False,
            deposit_amount=0,
            total_play_count=0,
            bonus_cap=10_000,
            progress=NewUserProgress(
                deposit_confirmed=False,
                play_1=False,
                play_3=False,
                share_or_join=False,
                next_day_login=False,
            ),
        )

    # Determine "new user" window from first_login_at (Telegram-native entry) with fallback to created_at.
    created = _to_utc_naive(getattr(user, "first_login_at", None) or getattr(user, "created_at", now_utc))
    window_ends_at = created + timedelta(hours=24)
    seconds_left = max(int((window_ends_at - now_utc).total_seconds()), 0)
    window_active = now_utc < window_ends_at

    # Conservative eligibility: only show the page within the 24h window.
    # (Existing users won't be eligible even if they manually navigate here.)
    if not window_active:
        return NewUserStatusResponse(
            eligible=False,
            reason="NEW_USER_WINDOW_EXPIRED",
            is_new_user_window_active=False,
            window_ends_at_utc=window_ends_at,
            seconds_left=0,
            telegram_linked=True,
            existing_member_by_external_deposit=False,
            deposit_amount=0,
            total_play_count=0,
            bonus_cap=10_000,
            progress=NewUserProgress(
                deposit_confirmed=False,
                play_1=False,
                play_3=False,
                share_or_join=False,
                next_day_login=False,
            ),
        )

    activity = db.query(UserActivity).filter(UserActivity.user_id == user_id).first()
    has_charge_history = bool(getattr(activity, "last_charge_at", None))

    ext = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user_id).first()
    deposit_amount = int(getattr(ext, "deposit_amount", 0) or 0)
    # Ops definition: existing member if they have any external deposit history.
    # We approximate "deposit count > 0" using activity.last_charge_at when available.
    existing_member_by_external_deposit = (deposit_amount > 0) or has_charge_history

    total_play_count = int(
        (getattr(activity, "roulette_plays", 0) or 0)
        + (getattr(activity, "dice_plays", 0) or 0)
        + (getattr(activity, "lottery_plays", 0) or 0)
    )

    tz_kst = ZoneInfo("Asia/Seoul")
    created_kst_date = (created.replace(tzinfo=timezone.utc)).astimezone(tz_kst).date()
    now_kst_date = now_utc.replace(tzinfo=timezone.utc).astimezone(tz_kst).date()
    next_day_login = now_kst_date > created_kst_date

    return NewUserStatusResponse(
        eligible=(not existing_member_by_external_deposit),
        reason=None if not existing_member_by_external_deposit else "EXTERNAL_DEPOSIT_HISTORY",
        is_new_user_window_active=True,
        window_ends_at_utc=window_ends_at,
        seconds_left=seconds_left,
        telegram_linked=True,
        existing_member_by_external_deposit=existing_member_by_external_deposit,
        deposit_amount=deposit_amount,
        total_play_count=total_play_count,
        bonus_cap=10_000,
        progress=NewUserProgress(
            deposit_confirmed=(deposit_amount > 0) or has_charge_history,
            play_1=total_play_count >= 1,
            play_3=total_play_count >= 3,
            # Check if user completed any JOIN_CHANNEL or SHARE missions
            share_or_join=db.query(UserMissionProgress).join(Mission).filter(
                UserMissionProgress.user_id == user_id,
                Mission.action_type.in_(["JOIN_CHANNEL", "SHARE", "SHARE_STORY", "SHARE_WALLET"]),
                UserMissionProgress.is_completed == True
            ).first() is not None,
            next_day_login=bool(next_day_login),
        ),
    )
