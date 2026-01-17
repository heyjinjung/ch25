import hashlib
import json
import logging
from typing import Any, Optional

import redis

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.event_service import EventService

logger = logging.getLogger(__name__)


class Ch25EventService:
    """Publish ch25_events with optional cooldown guard."""

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
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            return None

    def publish_event(self, event_type: str, data: dict[str, Any], cooldown_sec: int = 60) -> bool:
        client = self.get_redis_client()
        if not client:
            self._log_event_participation(event_type, data)
            return False

        settings = get_settings()
        if not settings.ch25_intervention_enabled:
            self._log_event_participation(event_type, data)
            return False

        user_id = data.get("user_id")
        if user_id is not None:
            group = self._assign_experiment_group(int(user_id), settings)
            if group == "CONTROL":
                self._log_event_participation(event_type, data)
                return False
            data = {**data, "experiment_group": group}
        if user_id is not None and cooldown_sec > 0:
            cooldown_key = f"ch25_events:cooldown:{event_type}:{user_id}"
            try:
                allowed = client.set(cooldown_key, "1", nx=True, ex=cooldown_sec)
            except Exception as e:
                logger.error(f"Cooldown check failed: {e}")
                allowed = True
            if not allowed:
                return False

        payload = {
            "event_type": event_type,
            "timestamp": data.get("timestamp"),
            "data": data,
        }
        self._log_event_participation(event_type, data)
        try:
            client.publish("ch25_events", json.dumps(payload, ensure_ascii=False))
            return True
        except Exception as e:
            logger.error(f"Failed to publish ch25_events: {e}")
            return False

    @staticmethod
    def _log_event_participation(event_type: str, data: dict[str, Any]) -> None:
        user_id = data.get("user_id")
        if user_id is None:
            return
        try:
            db = SessionLocal()
            EventService().safe_log_participation(
                db,
                user_id=int(user_id),
                event_type=event_type,
                reward_type=data.get("reward_type"),
                reward_amount=data.get("reward_amount"),
                meta=data,
            )
            db.commit()
        except Exception:
            return
        finally:
            try:
                db.close()
            except Exception:
                pass

    @staticmethod
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

    def publish_internal_game_result(self, data: dict[str, Any]) -> bool:
        """Publish internal game result into Redis stream for worker ingestion."""
        client = self.get_redis_client()
        if not client:
            return False

        payload = {
            "event_type": "INTERNAL_GAME_RESULT",
            "data": data,
        }
        try:
            client.xadd("stream:raw_logs", payload)
            return True
        except Exception as e:
            logger.error(f"Failed to publish internal game result: {e}")
            return False
