"""Admin dashboard metrics endpoint."""
from datetime import date, datetime, time, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Integer, case, func, select, text
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.feature import UserEventLog
from app.models.user import User
from app.models.roulette import RouletteLog
from app.models.dice import DiceLog
from app.models.lottery import LotteryLog
from app.models.game_wallet import GameTokenType
from app.models.game_wallet_ledger import UserGameWalletLedger
from app.models.user_activity_event import UserActivityEvent
from app.models.vault_earn_event import VaultEarnEvent
from app.schemas.admin_dashboard import (
    DashboardMetricsResponse,
    MetricValue,
    DailyOverviewResponse,
    EventsStatusResponse,
    ComprehensiveOverviewResponse,
)
from app.schemas.admin_streak_metrics import StreakDailyMetric, StreakMetricsResponse
from app.core.config import get_settings
from app.services.admin_dashboard_service import AdminDashboardService

# Note: Admin routers use full path prefixes (include_router is prefix-less).
# Keep the full `/admin/api/...` prefix here to align with frontend adminApi base.
router = APIRouter(prefix="/admin/api/dashboard", tags=["dashboard"])

_CACHE: dict[str, Any] = {"expires_at": None, "range_hours": None, "data": None}


_DEF_RANGE_MIN = 1
_DEF_RANGE_MAX = 168  # 7 days cap to avoid heavy scans
_DEF_CACHE_SECONDS = 300
_DEF_STREAK_DAYS_MAX = 31


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


@router.get("/streak", response_model=StreakMetricsResponse)
def get_streak_metrics(
    days: int = Query(7, ge=1, le=_DEF_STREAK_DAYS_MAX, description="Number of days to include (KST calendar days)"),
    db: Session = Depends(get_db),
) -> StreakMetricsResponse:
    now = datetime.utcnow()

    settings = get_settings()
    tz_name = getattr(settings, "timezone", "Asia/Seoul") or "Asia/Seoul"
    reset_hour_raw = getattr(settings, "streak_day_reset_hour_kst", 9)
    reset_hour = 9 if reset_hour_raw is None else int(reset_hour_raw)

    # KST bucketing: created_at (UTC) shifted by +9h, then DATE().
    # This is distinct from the streak operational-day (09:00 reset) concept.
    kst_offset = timedelta(hours=9)
    now_kst = now + kst_offset
    end_kst_date = now_kst.date()
    start_kst_date = end_kst_date - timedelta(days=int(days) - 1)
    start_utc = datetime.combine(start_kst_date, time(0, 0, 0)) - kst_offset
    end_utc_exclusive = datetime.combine(end_kst_date + timedelta(days=1), time(0, 0, 0)) - kst_offset

    dialect_name = ""
    try:
        if db.bind is not None and db.bind.dialect is not None:
            dialect_name = (db.bind.dialect.name or "").lower()
    except Exception:
        dialect_name = ""

    def _json_text(json_col, path: str):
        extracted = func.json_extract(json_col, path)
        if dialect_name in {"mysql", "mariadb"}:
            return func.json_unquote(extracted)
        return extracted

    def _json_int(json_col, path: str):
        # MySQL/MariaDB JSON_EXTRACT returns JSON; unquote then cast.
        if dialect_name in {"mysql", "mariadb"}:
            return func.cast(func.json_unquote(func.json_extract(json_col, path)), Integer)
        return func.cast(func.json_extract(json_col, path), Integer)

    def _kst_date(ts_col):
        # Return DATE(ts + 9h) in a way that works on SQLite and MySQL/MariaDB.
        if dialect_name in {"mysql", "mariadb"}:
            return func.date(func.date_add(ts_col, text("INTERVAL 9 HOUR")))
        if dialect_name == "sqlite":
            return func.date(ts_col, "+9 hours")
        # Fallback: keep UTC date if we don't know the dialect.
        return func.date(ts_col)

    # Aggregate user_event_log for streak events (UTC day buckets).
    day_expr = _kst_date(UserEventLog.created_at)
    streak_events = (
        db.query(
            day_expr.label("day"),
            func.sum(case((UserEventLog.event_name == "streak.promote", 1), else_=0)).label("promote"),
            func.sum(case((UserEventLog.event_name == "streak.reset", 1), else_=0)).label("reset"),
            func.sum(case((UserEventLog.event_name == "streak.ticket_bonus_grant", 1), else_=0)).label("ticket_bonus_grant"),
            func.sum(case((UserEventLog.event_name == "streak.vault_bonus_applied", 1), else_=0)).label("vault_bonus_applied"),
        )
        .filter(
            UserEventLog.feature_type == "STREAK",
            UserEventLog.created_at >= start_utc,
            UserEventLog.created_at < end_utc_exclusive,
        )
        .group_by(day_expr)
        .all()
    )
    by_day: dict[date, dict[str, int]] = {
        date.fromisoformat(str(row.day)): {
            "promote": int(row.promote or 0),
            "reset": int(row.reset or 0),
            "ticket_bonus_grant": int(row.ticket_bonus_grant or 0),
            "vault_bonus_applied": int(row.vault_bonus_applied or 0),
        }
        for row in streak_events
        if row.day is not None
    }

    # Aggregate vault_earn_event to derive base-play counts, applied counts, and exclusion reasons.
    v_day = _kst_date(VaultEarnEvent.created_at)

    streak_bonus_multiplier = _json_int(VaultEarnEvent.payout_raw_json, "$.streak_vault_bonus_multiplier")
    amount_before_multiplier = _json_int(VaultEarnEvent.payout_raw_json, "$.amount_before_multiplier")
    dice_mode = func.upper(_json_text(VaultEarnEvent.payout_raw_json, "$.mode"))

    dice_wrong_token = (
        (VaultEarnEvent.game_type == "DICE")
        & (VaultEarnEvent.token_type.isnot(None))
        & (VaultEarnEvent.token_type != GameTokenType.DICE_TOKEN.value)
    )
    roulette_wrong_token = (
        (VaultEarnEvent.game_type == "ROULETTE")
        & (VaultEarnEvent.token_type.isnot(None))
        & (VaultEarnEvent.token_type != GameTokenType.ROULETTE_COIN.value)
    )
    lottery_wrong_token = (
        (VaultEarnEvent.game_type == "LOTTERY")
        & (VaultEarnEvent.token_type.isnot(None))
        & (VaultEarnEvent.token_type != GameTokenType.LOTTERY_TICKET.value)
    )
    excluded_by_token_type = dice_wrong_token | roulette_wrong_token | lottery_wrong_token

    try:
        base_play_stmt = (
            db.query(
                v_day.label("day"),
                func.count().label("vault_base_plays"),
                func.sum(case((streak_bonus_multiplier > 1, 1), else_=0)).label(
                    "vault_bonus_applied_via_earn_event"
                ),
                func.sum(
                    case(
                        (
                            (VaultEarnEvent.game_type == "DICE")
                            & (dice_mode.isnot(None))
                            & (dice_mode != "NORMAL"),
                            1,
                        ),
                        else_=0,
                    )
                ).label("excluded_by_dice_mode"),
                func.sum(
                    case(
                        (excluded_by_token_type, 1),
                        else_=0,
                    )
                ).label("excluded_by_token_type"),
            )
            .filter(
                VaultEarnEvent.earn_type == "GAME_PLAY",
                VaultEarnEvent.created_at >= start_utc,
                VaultEarnEvent.created_at < end_utc_exclusive,
                amount_before_multiplier == 200,
                VaultEarnEvent.game_type.in_(["DICE", "ROULETTE", "LOTTERY"]),
            )
            .group_by(v_day)
            .all()
        )

        for row in base_play_stmt:
            if row.day is None:
                continue
            d = date.fromisoformat(str(row.day))
            by_day.setdefault(d, {})
            by_day[d].update(
                {
                    "vault_base_plays": int(row.vault_base_plays or 0),
                    "vault_bonus_applied_via_earn_event": int(row.vault_bonus_applied_via_earn_event or 0),
                    "excluded_by_dice_mode": int(row.excluded_by_dice_mode or 0),
                    "excluded_by_token_type": int(row.excluded_by_token_type or 0),
                }
            )
    except Exception:
        # Optional: some DBs/test configs may not support JSON extraction functions.
        pass

    # Build contiguous day list (oldest -> newest).
    items: list[StreakDailyMetric] = []
    for offset in range(int(days) - 1, -1, -1):
        d = (end_kst_date - timedelta(days=offset))
        m = by_day.get(d, {})
        items.append(
            StreakDailyMetric(
                day=d,
                promote=int(m.get("promote", 0) or 0),
                reset=int(m.get("reset", 0) or 0),
                ticket_bonus_grant=int(m.get("ticket_bonus_grant", 0) or 0),
                vault_bonus_applied=int(m.get("vault_bonus_applied", 0) or 0),
                vault_base_plays=int(m.get("vault_base_plays", 0) or 0),
                vault_bonus_applied_via_earn_event=int(m.get("vault_bonus_applied_via_earn_event", 0) or 0),
                excluded_by_dice_mode=int(m.get("excluded_by_dice_mode", 0) or 0),
                excluded_by_token_type=int(m.get("excluded_by_token_type", 0) or 0),
            )
        )

    notes: list[str] = [
        "이 표는 KST 달력일(날짜) 기준으로 집계됩니다.",
        f"스트릭(play_streak) 증가는 현재 '{'PLAY_GAME'}' 액션(게임 플레이)에서만 발생합니다.",
        f"운영일(스트릭 연속성) 리셋 기준은 KST {reset_hour:02d}:00 입니다(STREAK_DAY_RESET_HOUR_KST).",
    ]
    if reset_hour != 0:
        notes.append("자정(00:00) 리셋 이벤트를 원하면 STREAK_DAY_RESET_HOUR_KST=0 으로 설정해야 합니다.")

    return StreakMetricsResponse(
        days=int(days),
        generated_at=now,
        timezone=tz_name,
        calendar_bucket="KST calendar day (DATE(created_at + 9h))",
        operational_reset_hour_kst=reset_hour,
        streak_trigger="PLAY_GAME",
        notes=notes,
        items=items,
    )

# --- New Operations Dashboard Endpoints ---

@router.get("/daily-overview", response_model=DailyOverviewResponse)
def get_daily_overview(
    db: Session = Depends(get_db),
):
    """Daily routine check: Risk & Money."""
    service = AdminDashboardService()
    return service.get_daily_overview(db)

@router.get("/events-status", response_model=EventsStatusResponse)
def get_events_status(
    db: Session = Depends(get_db),
):
    """Live event monitoring."""
    service = AdminDashboardService()
    return service.get_event_status(db)

@router.get("/comprehensive", response_model=ComprehensiveOverviewResponse)
def get_comprehensive_overview(
    db: Session = Depends(get_db),
):
    """Daily comprehensive operational metrics."""
    service = AdminDashboardService()
    return service.get_daily_overview(db)


@router.post("/notifications/nudge")
def nudge_risk_group(
    db: Session = Depends(get_db),
):
    """Trigger manual nudge for risk group."""
    service = AdminDashboardService()
    count = service.nudge_risk_group(db)
    return {"status": "success", "nudged_count": count}
