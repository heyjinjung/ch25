"""Golden V2 event worker (bridge ch25_events -> golden:v2 channels)."""
from __future__ import annotations

import asyncio
import json
import logging
from app.v2.services.golden_event_service import GoldenV2EventService

logger = logging.getLogger(__name__)


async def _run_bridge(stop_event: asyncio.Event) -> None:
    try:
        import redis.asyncio as aioredis
    except ImportError:  # pragma: no cover - optional dependency
        logger.warning("redis async not installed; golden v2 worker disabled")
        return

    from app.core.config import get_settings

    settings = get_settings()
    if not settings.redis_url:
        logger.warning("redis_url not configured; golden v2 worker disabled")
        return

    client = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = client.pubsub()
    await pubsub.subscribe("ch25_events")

    v2_service = GoldenV2EventService()

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
                v2_service.publish_intervention_event(payload)
    finally:
        try:
            await pubsub.unsubscribe("ch25_events")
            await pubsub.close()
            await client.close()
        except Exception:
            pass


async def run_golden_event_worker(stop_event: asyncio.Event | None = None) -> None:
    local_stop = stop_event or asyncio.Event()
    try:
        await _run_bridge(stop_event=local_stop)
    except asyncio.CancelledError:
        local_stop.set()
        raise


async def main() -> None:
    stop_event = asyncio.Event()
    try:
        await run_golden_event_worker(stop_event=stop_event)
    except KeyboardInterrupt:  # pragma: no cover - manual stop
        stop_event.set()


if __name__ == "__main__":
    asyncio.run(main())
