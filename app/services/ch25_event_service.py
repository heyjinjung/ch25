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
        """Publish internal game result into Redis stream for worker ingestion.

        Ensure payload fields are stringified because Redis streams require string/bytes values.
        """
        client = self.get_redis_client()
        if not client:
            return False

        payload = {
            "event_type": "INTERNAL_GAME_RESULT",
            # store data as JSON string to maintain shape and make worker parsing deterministic
            "data": json.dumps(data, ensure_ascii=False),
        }
        try:
            normalized = normalize_stream_payload(payload)
            logger.info("Normalized payload for stream:raw_logs", extra={"payload_types": {k: type(v).__name__ for k, v in normalized.items()}, "user_id": data.get("user_id")})

            # Final safety pass: ensure no dict/list remains and all values are strings
            final_payload: dict[str, str] = {}
            for k, v in normalized.items():
                if isinstance(v, dict) or isinstance(v, list):
                    logger.error("Found non-string in normalized payload; JSON-dumping before xadd", extra={"key": k, "value_repr": repr(v)})
                    final_payload[k] = json.dumps(v, ensure_ascii=False)
                elif isinstance(v, bytes):
                    final_payload[k] = v.decode("utf-8", errors="replace")
                elif v is None:
                    final_payload[k] = ""
                else:
                    final_payload[k] = str(v)

            logger.info("Final payload prepared for xadd", extra={"payload_types": {k: type(v).__name__ for k, v in final_payload.items()}, "user_id": data.get("user_id")})
            client.xadd("stream:raw_logs", final_payload)
            logger.info("Published internal game result to stream:raw_logs", extra={"user_id": data.get("user_id")})
            return True
        except Exception as e:
            try:
                info_types = {k: type(v).__name__ for k, v in (normalized.items() if 'normalized' in locals() else payload.items())}
            except Exception:
                info_types = {}
            logger.error(f"Failed to publish internal game result: {e} | payload_types={info_types} | payload_repr={repr(normalized) if 'normalized' in locals() else repr(payload)}")
            return False


def normalize_stream_payload(payload: dict[str, Any]) -> dict[str, str]:
    """Normalize a Redis stream payload so all values are strings (or decodable).

    Rules:
    - str: keep
    - bytes: decode as utf-8 (replace errors)
    - dict/list: JSON-dump with ensure_ascii=False
    - None: empty string
    - other: str(...)
    """
    normalized: dict[str, str] = {}
    for k, v in payload.items():
        try:
            if isinstance(v, str):
                normalized[k] = v
            elif isinstance(v, bytes):
                normalized[k] = v.decode("utf-8", errors="replace")
            elif isinstance(v, (dict, list)):
                normalized[k] = json.dumps(v, ensure_ascii=False)
            elif v is None:
                normalized[k] = ""
            else:
                normalized[k] = str(v)
        except Exception:
            # Fallback to string repr to avoid passing non-string types to xadd
            normalized[k] = str(v)
    return normalized
