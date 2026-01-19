"""Golden V2 event publisher (Redis Pub/Sub)."""
from __future__ import annotations

import json
import logging
from typing import Any, Optional

import redis

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class GoldenV2EventService:
    """Publish Golden V2 events into Redis channels."""

    _redis_client: Optional[redis.Redis] = None

    @classmethod
    def get_redis_client(cls) -> Optional[redis.Redis]:
        if cls._redis_client is not None:
            return cls._redis_client

        settings = get_settings()
        if not settings.redis_url:
            return None

        try:
            cls._redis_client = redis.from_url(settings.redis_url, decode_responses=True)
            return cls._redis_client
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to connect to Redis", exc_info=exc)
            return None

    def publish_game_event(self, payload: dict[str, Any]) -> bool:
        client = self.get_redis_client()
        if not client:
            return False
        try:
            client.publish("golden:v2:events:game", json.dumps(payload, ensure_ascii=False))
            return True
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to publish golden:v2:events:game", exc_info=exc)
            return False

    def publish_intervention_event(self, payload: dict[str, Any]) -> bool:
        client = self.get_redis_client()
        if not client:
            return False
        try:
            client.publish("golden:v2:events:intervention", json.dumps(payload, ensure_ascii=False))
            return True
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to publish golden:v2:events:intervention", exc_info=exc)
            return False