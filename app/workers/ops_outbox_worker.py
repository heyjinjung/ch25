"""Outbox consumer for admin ops events.

Consumes messages from the Redis list `ops:outbox`, retries on publish failure
with exponential backoff, and moves exhausted messages to a DLQ.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


async def _get_redis_client():
    try:
        import redis.asyncio as aioredis
    except ImportError:  # pragma: no cover - optional dependency
        logger.warning("redis async not installed; ops outbox worker disabled")
        return None

    from app.core.config import get_settings

    settings = get_settings()
    if not settings.redis_url:
        logger.warning("redis_url not configured; ops outbox worker disabled")
        return None
    return aioredis.from_url(settings.redis_url, decode_responses=True)


async def _publish_ws(client, payload: dict[str, Any]) -> None:
    await client.publish("ops:ws", json.dumps(payload, ensure_ascii=False))


async def run_ops_outbox_worker(stop_event: Optional[asyncio.Event] = None) -> None:
    """Continuously consume ops outbox and dispatch to WebSocket channel.

    - Queue key: `ops:outbox`
    - DLQ key: from settings (default `ops:outbox:dlq`)
    - Retry: up to settings.ops_outbox_max_retries with exponential backoff
    """

    client = await _get_redis_client()
    if client is None:
        logger.info("ops_outbox_worker_disabled", extra={"reason": "no_redis"})
        return

    from app.core.config import get_settings

    settings = get_settings()
    queue_key = "ops:outbox"
    dlq_key = settings.ops_outbox_dlq_key
    max_retries = settings.ops_outbox_max_retries
    backoff_base = settings.ops_outbox_backoff_base_seconds

    processed = 0
    published = 0
    moved_dlq = 0

    logger.info(
        "ops_outbox_worker_started",
        extra={"queue": queue_key, "dlq": dlq_key, "max_retries": max_retries},
    )

    try:
        while True:
            try:
                item = await client.brpop(queue_key, timeout=1)
                if item is None:
                    continue
                _, raw = item
                try:
                    payload = json.loads(raw)
                except Exception as exc:  # noqa: BLE001
                    await client.lpush(dlq_key, raw)
                    moved_dlq += 1
                    processed += 1
                    logger.error("ops_outbox_payload_parse_failed", exc_info=exc)
                    continue

                attempts = int(payload.get("_retry", 0))
                try:
                    await _publish_ws(client, payload)
                    logger.info("ops_outbox_dispatched", extra={"event": payload})
                    processed += 1
                    published += 1
                    continue
                except Exception as exc:  # noqa: BLE001
                    attempts += 1
                    payload["_retry"] = attempts
                    if attempts >= max_retries:
                        await client.lpush(dlq_key, json.dumps(payload, ensure_ascii=False))
                        moved_dlq += 1
                        processed += 1
                        logger.error("ops_outbox_to_dlq", exc_info=exc, extra={"event": payload})
                        continue
                    await asyncio.sleep(backoff_base * (2 ** (attempts - 1)))
                    await client.lpush(queue_key, json.dumps(payload, ensure_ascii=False))
                    logger.warning("ops_outbox_retry_scheduled", extra={"event": payload})
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # noqa: BLE001
                logger.error("ops_outbox_worker_loop_error", exc_info=exc)
                await asyncio.sleep(1)
    finally:
        try:
            await client.close()
        except Exception:
            pass
        logger.info(
            "ops_outbox_worker_stopped",
            extra={"processed": processed, "published": published, "dlq": moved_dlq},
        )


async def main():
    stop_event = asyncio.Event()
    try:
        await run_ops_outbox_worker(stop_event=stop_event)
    except KeyboardInterrupt:  # pragma: no cover - manual stop
        stop_event.set()


if __name__ == "__main__":
    asyncio.run(main())
