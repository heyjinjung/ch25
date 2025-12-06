"""Common helpers for game services (logging, season-pass hooks)."""
from dataclasses import dataclass
from datetime import date
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import DailyLimitReachedError


@dataclass
class GamePlayContext:
    """Context container for a single game play action."""

    user_id: int
    feature_type: str
    today: date
    request_id: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


def log_game_play(ctx: GamePlayContext, db: Session, result_payload: dict[str, Any]) -> None:
    """Placeholder for shared event logging across games."""

    # TODO: Implement user_event_log persistence once the model is defined.
    _ = (ctx, db, result_payload)


def enforce_daily_limit(limit: int, played: int) -> None:
    """Raise when the played count exceeds or meets the daily limit."""

    if played >= limit:
        raise DailyLimitReachedError()


def apply_season_pass_stamp(ctx: GamePlayContext, db: Session, xp_bonus: int = 0) -> dict | None:
    """Hook to call SeasonPassService.add_stamp when needed."""

    # TODO: integrate SeasonPassService when authentication/user flows are ready.
    _ = (ctx, db, xp_bonus)
    return None
