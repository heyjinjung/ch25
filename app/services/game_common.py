"""Common helpers for game services (logging, season-pass hooks)."""
from dataclasses import dataclass
from datetime import date
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import DailyLimitReachedError
from app.models.feature import UserEventLog
from app.services.season_pass_service import SeasonPassService
from app.services.team_battle_service import TeamBattleService

@dataclass
class GamePlayContext:
    """Context container for a single game play action."""

    user_id: int
    feature_type: str
    today: date
    request_id: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


def log_game_play(ctx: GamePlayContext, db: Session, result_payload: dict[str, Any]) -> None:
    """Persist shared event logging across games into user_event_log."""

    entry = UserEventLog(
        user_id=ctx.user_id,
        feature_type=ctx.feature_type,
        event_name="PLAY",
        meta_json=result_payload,
    )
    db.add(entry)
    db.commit()

    # Opportunistically award team battle points; failures are non-blocking by design.
    _log_team_battle_points(ctx, db, result_payload)


def enforce_daily_limit(limit: int, played: int) -> None:
    """Raise when the played count exceeds or meets the daily limit."""

    if played >= limit:
        raise DailyLimitReachedError()


def apply_season_pass_stamp(ctx: GamePlayContext, db: Session, xp_bonus: int = 0) -> dict | None:
    """Hook to call SeasonPassService.add_stamp when season is active."""

    svc = SeasonPassService()
    try:
        return svc.add_stamp(db, user_id=ctx.user_id, source_feature_type=ctx.feature_type, xp_bonus=xp_bonus, now=ctx.today)
    except Exception:
        # If season pass is inactive or already stamped, do not block game flow.
        return None


def _log_team_battle_points(ctx: GamePlayContext, db: Session, result_payload: dict[str, Any]) -> None:
    """Bridge game plays into team battle scoring without breaking core flow."""

    svc = TeamBattleService()
    try:
        member = svc.get_membership(db, ctx.user_id)
        if not member:
            return

        season = svc.get_active_season(db) or svc.ensure_current_season(db)

        meta = {
            "feature_type": ctx.feature_type,
            "result": result_payload.get("result"),
            "reward_type": result_payload.get("reward_type"),
            "reward_amount": result_payload.get("reward_amount"),
        }

        svc.add_points(
            db,
            team_id=member.team_id,
            delta=svc.POINTS_PER_PLAY,
            action="GAME_PLAY",
            user_id=ctx.user_id,
            season_id=season.id,
            meta=meta,
            enforce_usage=False,
        )
    except Exception:
        # Team battle should never block the main game play path.
        return
