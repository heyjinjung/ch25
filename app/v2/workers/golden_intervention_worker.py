"""Golden V2 intervention worker (consume game events -> publish intervention events)."""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

GAME_CHANNEL = "golden:v2:events:game"
INTERVENTION_CHANNEL = "golden:v2:events:intervention"

LOSS_STREAK_THRESHOLD = 5
BALANCE_DROP_THRESHOLD = 0.5
COOLDOWN_SECONDS = 60 * 60
SESSION_TTL_SECONDS = 24 * 60 * 60
PSYCH_STATE_TTL_SECONDS = 24 * 60 * 60


async def _publish_intervention(client, payload: dict[str, Any]) -> None:
    try:
        await client.publish(INTERVENTION_CHANNEL, json.dumps(payload, ensure_ascii=False))
    except Exception:
        return


async def _try_set_cooldown(client, key: str) -> bool:
    try:
        return bool(await client.set(key, "1", nx=True, ex=COOLDOWN_SECONDS))
    except Exception:
        return True


async def _handle_loss_streak(client, user_id: int, loss_streak: int, event: dict[str, Any]) -> None:
    if loss_streak < LOSS_STREAK_THRESHOLD:
        return

    cooldown_key = f"golden:v2:cooldown:TRG_LOSE_5:{user_id}"
    if not await _try_set_cooldown(client, cooldown_key):
        return

    await client.set(
        f"golden:v2:user:{user_id}:psych_state",
        "FRUSTRATED",
        ex=PSYCH_STATE_TTL_SECONDS,
    )

    payload = {
        "target_user_id": user_id,
        "trigger_id": "TRG_LOSE_5",
        "type": "INTERVENTION",
        "payload": {
            "reason": "LOSS_STREAK",
            "current_streak": loss_streak,
            "event_id": event.get("event_id"),
            "timestamp": event.get("timestamp"),
        },
    }
    await _publish_intervention(client, payload)


async def _handle_balance_drop(client, user_id: int, current_balance: int, event: dict[str, Any]) -> None:
    session_key = f"golden:v2:user:{user_id}:session_start_balance"
    session_start_raw = await client.get(session_key)

    if session_start_raw is None:
        await client.set(session_key, int(current_balance or 0), ex=SESSION_TTL_SECONDS)
        return

    try:
        session_start = int(session_start_raw)
    except (TypeError, ValueError):
        await client.set(session_key, int(current_balance or 0), ex=SESSION_TTL_SECONDS)
        return

    if session_start <= 0:
        return

    drop_ratio = (session_start - current_balance) / session_start
    if drop_ratio < BALANCE_DROP_THRESHOLD:
        return

    cooldown_key = f"golden:v2:cooldown:TRG_BAL_DROP_50:{user_id}"
    if not await _try_set_cooldown(client, cooldown_key):
        return

    await client.set(
        f"golden:v2:user:{user_id}:psych_state",
        "FRUSTRATED",
        ex=PSYCH_STATE_TTL_SECONDS,
    )

    payload = {
        "target_user_id": user_id,
        "trigger_id": "TRG_BAL_DROP_50",
        "type": "INTERVENTION",
        "payload": {
            "reason": "BALANCE_DROP_50",
            "session_start_balance": session_start,
            "current_balance": current_balance,
            "drop_ratio": round(drop_ratio, 4),
            "event_id": event.get("event_id"),
            "timestamp": event.get("timestamp"),
        },
    }
    await _publish_intervention(client, payload)


async def _process_event(client, event: dict[str, Any]) -> None:
    user_id = event.get("user_id")
    if user_id is None:
        return

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return

    loss_key = f"golden:v2:user:{user_id}:loss_streak"
    try:
        loss_streak = int(await client.get(loss_key) or 0)
    except (TypeError, ValueError):
        loss_streak = 0

    result = str(event.get("result") or "").upper()
    current_balance = int(event.get("current_balance") or 0)

    if result == "LOSE":
        await _handle_loss_streak(client, user_id, loss_streak, event)

    await _handle_balance_drop(client, user_id, current_balance, event)


async def _run_worker(stop_event: asyncio.Event) -> None:
    try:
        import redis.asyncio as aioredis
    except ImportError:  # pragma: no cover - optional dependency
        logger.warning("redis async not installed; golden intervention worker disabled")
        return

    from app.core.config import get_settings

    settings = get_settings()
    if not settings.redis_url:
        logger.warning("redis_url not configured; golden intervention worker disabled")
        return

    client = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = client.pubsub()
    await pubsub.subscribe(GAME_CHANNEL)

    try:
        while not stop_event.is_set():
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if not message:
                await asyncio.sleep(0.1)
                continue
            if message.get("type") != "message":
                continue

            raw = message.get("data")
            try:
                payload = json.loads(raw) if isinstance(raw, str) else raw
            except json.JSONDecodeError:
                continue

            if isinstance(payload, dict):
                await _process_event(client, payload)
    finally:
        try:
            await pubsub.unsubscribe(GAME_CHANNEL)
            await pubsub.close()
            await client.close()
        except Exception:
            pass


async def run_golden_intervention_worker(stop_event: asyncio.Event | None = None) -> None:
    local_stop = stop_event or asyncio.Event()
    try:
        await _run_worker(stop_event=local_stop)
    except asyncio.CancelledError:
        local_stop.set()
        raise


async def main() -> None:
    stop_event = asyncio.Event()
    try:
        await run_golden_intervention_worker(stop_event=stop_event)
    except KeyboardInterrupt:  # pragma: no cover - manual stop
        stop_event.set()


if __name__ == "__main__":
    asyncio.run(main())
