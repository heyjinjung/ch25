"""Common helpers for game services (logging, season-pass hooks)."""
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional
from uuid import uuid4

import hashlib
import redis

from sqlalchemy.orm import Session

from app.core.exceptions import DailyLimitReachedError
from app.core.config import get_settings
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

    _publish_internal_game_result(ctx, db, result_payload)

    _record_dda_outcome_if_needed(ctx, result_payload)


def _publish_internal_game_result(ctx: GamePlayContext, db: Session, result_payload: dict[str, Any]) -> None:
    settings = get_settings()
    if not settings.ch25_internal_stream_enabled:
        return

    bet_amount = _estimate_bet_amount(ctx, settings)
    payout_amount = _estimate_payout_amount(result_payload, settings)

    event_ts = int(datetime.now(tz=timezone(timedelta(hours=9))).timestamp())

    data = {
        "user_id": ctx.user_id,
        "game_type": (ctx.feature_type or "").lower(),
        "bet_amount": bet_amount,
        "payout_amount": payout_amount,
        "reward_type": result_payload.get("reward_type"),
        "reward_amount": result_payload.get("reward_amount"),
        "timestamp": event_ts,
        "source": "internal",
    }

    try:
        from app.services.ch25_event_service import Ch25EventService

        Ch25EventService().publish_internal_game_result(data)
    except Exception:
        pass

    _publish_golden_v2_game_event(ctx, db, result_payload, bet_amount, payout_amount)


def _publish_golden_v2_game_event(
    ctx: GamePlayContext,
    db: Session,
    result_payload: dict[str, Any],
    bet_amount: int,
    payout_amount: int,
) -> None:
    client = _get_golden_redis_client()
    if client is None:
        return

    result = _infer_game_result(result_payload)
    current_balance = _get_current_balance(db, ctx.user_id)
    _update_golden_redis_state(client, ctx.user_id, result, current_balance)

    payload = {
        "event_id": str(uuid4()),
        "timestamp": int(datetime.now(tz=timezone(timedelta(hours=9))).timestamp() * 1000),
        "user_id": ctx.user_id,
        "game_type": (ctx.feature_type or "").upper(),
        "result": result,
        "bet_amount": bet_amount,
        "payout": payout_amount,
        "current_balance": current_balance,
    }

    try:
        from app.v2.services.golden_event_service import GoldenV2EventService

        GoldenV2EventService().publish_game_event(payload)
    except Exception:
        return


def _estimate_bet_amount(ctx: GamePlayContext, settings) -> int:
    feature = (ctx.feature_type or "").upper()
    if feature == "ROULETTE":
        return int(settings.roulette_bet_value)
    if feature == "DICE":
        return int(settings.dice_bet_value)
    if feature == "LOTTERY":
        return int(settings.lottery_bet_value)
    return 0


def _estimate_payout_amount(result_payload: dict[str, Any], settings) -> int:
    reward_amount = result_payload.get("reward_amount")
    reward_amount = int(reward_amount or 0)
    reward_type = str(result_payload.get("reward_type") or "").upper()
    if reward_type == "NONE":
        return 0
    if "POINT" in reward_type:
        return reward_amount
    ticket_value = _ticket_reward_value(reward_type, settings)
    if ticket_value is not None:
        return ticket_value
    if reward_amount <= 0:
        return 0
    return max(reward_amount, int(settings.ticket_reward_min))


def _ticket_reward_value(reward_type: str, settings) -> int | None:
    ticket_map = {
        "ROULETTE_COIN": int(settings.roulette_bet_value),
        "ROULETTE_TICKET": int(settings.roulette_bet_value),
        "TICKET_ROULETTE": int(settings.roulette_bet_value),
        "DICE_TOKEN": int(settings.dice_bet_value),
        "DICE_TICKET": int(settings.dice_bet_value),
        "TICKET_DICE": int(settings.dice_bet_value),
        "LOTTERY_TICKET": int(settings.lottery_bet_value),
        "TICKET_LOTTERY": int(settings.lottery_bet_value),
    }
    return ticket_map.get(reward_type)


def _infer_game_result(result_payload: dict[str, Any]) -> str:
    result = str(result_payload.get("result") or result_payload.get("outcome") or "").upper()
    if result in {"WIN", "LOSE", "DRAW"}:
        return result
    reward_amount = int(result_payload.get("reward_amount") or 0)
    return "WIN" if reward_amount > 0 else "LOSE"


def _get_current_balance(db: Session, user_id: int) -> int:
    try:
        from app.models.user import User

        user = db.get(User, user_id)
        return int(getattr(user, "vault_locked_balance", 0) or 0)
    except Exception:
        return 0


_GOLDEN_REDIS_CLIENT: Optional[redis.Redis] = None


def _get_golden_redis_client() -> Optional[redis.Redis]:
    global _GOLDEN_REDIS_CLIENT
    if _GOLDEN_REDIS_CLIENT is not None:
        return _GOLDEN_REDIS_CLIENT

    settings = get_settings()
    if not settings.redis_url:
        return None
    try:
        _GOLDEN_REDIS_CLIENT = redis.from_url(settings.redis_url, decode_responses=True)
        return _GOLDEN_REDIS_CLIENT
    except Exception:
        return None


def _update_golden_redis_state(client: redis.Redis, user_id: int, result: str, current_balance: int) -> None:
    loss_streak_ttl = 60 * 60
    session_ttl = 24 * 60 * 60
    psych_ttl = 24 * 60 * 60

    legacy_loss_key = f"user:{user_id}:loss_streak"
    v2_loss_key = f"golden:v2:user:{user_id}:loss_streak"
    vault_locked_key = f"user:{user_id}:vault:locked"

    try:
        if result == "LOSE":
            client.incr(legacy_loss_key)
            client.expire(legacy_loss_key, loss_streak_ttl)
            client.incr(v2_loss_key)
            client.expire(v2_loss_key, loss_streak_ttl)
        else:
            client.set(legacy_loss_key, 0, ex=loss_streak_ttl)
            client.set(v2_loss_key, 0, ex=loss_streak_ttl)

        client.set(vault_locked_key, int(current_balance or 0), ex=session_ttl)

        session_key = f"golden:v2:user:{user_id}:session_start_balance"
        client.set(session_key, int(current_balance or 0), nx=True, ex=session_ttl)

        psych_key = f"golden:v2:user:{user_id}:psych_state"
        client.set(psych_key, "NEUTRAL", nx=True, ex=psych_ttl)
    except Exception:
        return


_DDA_REDIS_CLIENT: Optional[redis.Redis] = None


def _get_dda_redis_client() -> Optional[redis.Redis]:
    global _DDA_REDIS_CLIENT
    if _DDA_REDIS_CLIENT is not None:
        return _DDA_REDIS_CLIENT

    settings = get_settings()
    if not settings.redis_url:
        return None
    try:
        _DDA_REDIS_CLIENT = redis.from_url(settings.redis_url, decode_responses=True)
        return _DDA_REDIS_CLIENT
    except Exception:
        return None


def _assign_experiment_group(user_id: int, settings) -> str:
    rollout = max(0, min(100, int(settings.ch25_intervention_rollout_pct)))
    seed = settings.ch25_intervention_seed
    digest = hashlib.sha1(f"{seed}:{user_id}".encode("utf-8")).hexdigest()
    bucket = int(digest[:8], 16) % 100
    if bucket >= rollout:
        return "CONTROL"
    if bucket < 25:
        return "CONTROL"
    if bucket < 50:
        return "FREE_SPIN"
    if bucket < 75:
        return "CASHBACK"
    return "MISSION"


def should_apply_dda(user_id: int, settings) -> bool:
    if not settings.ch25_dda_enabled:
        return False
    if not settings.ch25_intervention_enabled:
        return False
    if _assign_experiment_group(user_id, settings) == "CONTROL":
        return False

    client = _get_dda_redis_client()
    if client is None:
        return False

    streak_key = f"ch25:dda:{user_id}:loss_streak"
    used_key = f"ch25:dda:{user_id}:boost_used"
    streak = int(client.get(streak_key) or 0)
    if streak > -int(settings.ch25_dda_loss_streak_threshold):
        return False
    used = int(client.get(used_key) or 0)
    if used >= int(settings.ch25_dda_max_consecutive):
        return False
    return True


def record_dda_outcome(user_id: int, is_win: bool, applied: bool, settings) -> None:
    client = _get_dda_redis_client()
    if client is None:
        return

    streak_key = f"ch25:dda:{user_id}:loss_streak"
    used_key = f"ch25:dda:{user_id}:boost_used"
    ttl = 24 * 60 * 60

    if is_win:
        client.set(streak_key, 0, ex=ttl)
        client.set(used_key, 0, ex=ttl)
        return

    client.incrby(streak_key, -1)
    client.expire(streak_key, ttl)
    if applied:
        client.incr(used_key)
        client.expire(used_key, ttl)


def _record_dda_outcome_if_needed(ctx: GamePlayContext, result_payload: dict[str, Any]) -> None:
    settings = get_settings()
    if not settings.ch25_dda_enabled:
        return

    user_id = ctx.user_id
    reward_type = str(result_payload.get("reward_type") or "").upper()
    is_win = reward_type != "NONE"
    applied = bool(result_payload.get("dda_applied"))
    record_dda_outcome(user_id, is_win, applied, settings)


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
        user_id = int(ctx.user_id)

        member = svc.get_membership(db, user_id)
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
            user_id=user_id,
            season_id=season.id,
            meta=meta,
            enforce_usage=False,
        )
    except Exception:
        # Team battle should never block the main game play path.
        return
