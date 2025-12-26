"""Admin dashboard metrics endpoint."""
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.user import User
from app.models.roulette import RouletteLog
from app.models.dice import DiceLog
from app.models.lottery import LotteryLog
from app.models.game_wallet import GameTokenType
from app.models.game_wallet_ledger import UserGameWalletLedger
from app.models.user_activity_event import UserActivityEvent
from app.schemas.admin_dashboard import DashboardMetricsResponse, MetricValue

# Note: Admin routers use full path prefixes (include_router is prefix-less).
# Keep the full `/admin/api/...` prefix here to align with frontend adminApi base.
router = APIRouter(prefix="/admin/api/dashboard", tags=["dashboard"])

_CACHE: dict[str, Any] = {"expires_at": None, "range_hours": None, "data": None}


_DEF_RANGE_MIN = 1
_DEF_RANGE_MAX = 168  # 7 days cap to avoid heavy scans
_DEF_CACHE_SECONDS = 300


_ALLOWED_TOKENS = (
    GameTokenType.ROULETTE_COIN,
    GameTokenType.DICE_TOKEN,
    GameTokenType.LOTTERY_TICKET,
)


def _clamp_range(hours: int) -> int:
    return max(_DEF_RANGE_MIN, min(_DEF_RANGE_MAX, hours))


def _pct(curr: float | int | None, prev: float | int | None) -> float | None:
    if prev in (None, 0, 0.0):
        return None
    if curr is None:
        return None
    try:
        return float((curr - prev) / prev * 100)
    except Exception:
        return None


def _active_users(db: Session, start: datetime, end: datetime) -> int:
    return int(
        db.query(func.count())
        .select_from(User)
        .filter(User.last_login_at >= start, User.last_login_at < end)
        .scalar()
        or 0
    )


def _play_counts(db: Session, start: datetime, end: datetime) -> tuple[int, int]:
    # total plays
    roulette_count = (
        db.query(func.count())
        .select_from(RouletteLog)
        .filter(RouletteLog.created_at >= start, RouletteLog.created_at < end)
        .scalar()
        or 0
    )
    dice_count = (
        db.query(func.count())
        .select_from(DiceLog)
        .filter(DiceLog.created_at >= start, DiceLog.created_at < end)
        .scalar()
        or 0
    )
    lottery_count = (
        db.query(func.count())
        .select_from(LotteryLog)
        .filter(LotteryLog.created_at >= start, LotteryLog.created_at < end)
        .scalar()
        or 0
    )
    total = int(roulette_count + dice_count + lottery_count)

    # unique players across all games
    first_select = select(RouletteLog.user_id.label("user_id")).where(
        RouletteLog.created_at >= start, RouletteLog.created_at < end
    )
    union_stmt = first_select.union(
        select(DiceLog.user_id.label("user_id")).where(DiceLog.created_at >= start, DiceLog.created_at < end),
        select(LotteryLog.user_id.label("user_id")).where(
            LotteryLog.created_at >= start, LotteryLog.created_at < end
        ),
    )
    union_user_ids = union_stmt.subquery()
    unique_players = int(db.query(func.count(func.distinct(union_user_ids.c.user_id))).scalar() or 0)
    return total, unique_players


def _ticket_usage(db: Session, start: datetime, end: datetime) -> int:
    total_delta = (
        db.query(func.coalesce(func.sum(UserGameWalletLedger.delta), 0))
        .filter(
            UserGameWalletLedger.created_at >= start,
            UserGameWalletLedger.created_at < end,
            UserGameWalletLedger.token_type.in_(_ALLOWED_TOKENS),
            UserGameWalletLedger.delta < 0,
        )
        .scalar()
        or 0
    )
    # Return absolute consumed amount.
    return int(abs(total_delta))


def _avg_session_seconds(db: Session, start: datetime, end: datetime) -> float | None:
    avg_val = (
        db.query(func.avg(UserActivityEvent.duration_seconds))
        .filter(
            UserActivityEvent.event_type == "PLAY_DURATION",
            UserActivityEvent.duration_seconds.isnot(None),
            UserActivityEvent.duration_seconds > 0,
            UserActivityEvent.created_at >= start,
            UserActivityEvent.created_at < end,
        )
        .scalar()
    )
    return float(avg_val) if avg_val is not None else None


def _compute_window(db: Session, start: datetime, end: datetime) -> dict[str, float | int | None]:
    active = _active_users(db, start, end)
    total_plays, unique_players = _play_counts(db, start, end)
    tickets = _ticket_usage(db, start, end)
    avg_session = _avg_session_seconds(db, start, end)
    return {
        "active_users": active,
        "game_participation": total_plays,
        "unique_players": unique_players,
        "ticket_usage": tickets,
        "avg_session_time_seconds": avg_session,
    }


@router.get("/metrics", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(
    range_hours: int = Query(24, ge=1, le=_DEF_RANGE_MAX, description="Range window in hours"),
    db: Session = Depends(get_db),
) -> DashboardMetricsResponse:
    hours = _clamp_range(range_hours)
    now = datetime.utcnow()

    # Cache per range_hours
    cache_key = f"metrics_{hours}"
    if (
        _CACHE.get("range_hours") == hours
        and _CACHE.get("expires_at")
        and _CACHE["expires_at"] > now
        and _CACHE.get("data") is not None
    ):
        return _CACHE["data"]

    current_start = now - timedelta(hours=hours)
    prev_start = current_start - timedelta(hours=hours)
    prev_end = current_start

    current = _compute_window(db, current_start, now)
    previous = _compute_window(db, prev_start, prev_end)

    response = DashboardMetricsResponse(
        range_hours=hours,
        generated_at=now,
        active_users=MetricValue(
            value=current["active_users"],
            diff_percent=_pct(current["active_users"], previous["active_users"]),
        ),
        game_participation=MetricValue(
            value=current["game_participation"],
            diff_percent=_pct(current["game_participation"], previous["game_participation"]),
        ),
        unique_players=MetricValue(
            value=current["unique_players"],
            diff_percent=_pct(current["unique_players"], previous["unique_players"]),
        ),
        ticket_usage=MetricValue(
            value=current["ticket_usage"],
            diff_percent=_pct(current["ticket_usage"], previous["ticket_usage"]),
        ),
        avg_session_time_seconds=MetricValue(
            value=current["avg_session_time_seconds"],
            diff_percent=_pct(current["avg_session_time_seconds"], previous["avg_session_time_seconds"]),
        ),
    )

    _CACHE.update(
        {
            "range_hours": hours,
            "expires_at": now + timedelta(seconds=_DEF_CACHE_SECONDS),
            "data": response,
        }
    )
    return response
