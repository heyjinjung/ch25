import json
import logging
import uuid
import redis
from datetime import datetime
from typing import Optional, Dict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.user import User
from app.services.vault2_service import Vault2Service

logger = logging.getLogger(__name__)

class FeedService:
    """Service for publishing real-time feed messages to Redis."""

    _redis_client: Optional[redis.Redis] = None

    @classmethod
    def get_redis_client(cls) -> Optional[redis.Redis]:
        if cls._redis_client is not None:
            return cls._redis_client

        settings = get_settings()
        if not settings.redis_url:
            return None

        try:
            # Create a shared connection pool
            cls._redis_client = redis.from_url(settings.redis_url, decode_responses=True)
            return cls._redis_client
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            return None

    def get_jackpot_config(self, db: Session) -> Dict[str, int]:
        """Retrieve jackpot configuration from Vault2 (or defaults)."""
        defaults = {"threshold": 10000, "mega_threshold": 50000}
        try:
            v2 = Vault2Service()
            config = v2.get_config_value(db, "jackpot_config", defaults)
            if not config:
                return defaults
            return {
                "threshold": int(config.get("threshold", 10000)),
                "mega_threshold": int(config.get("mega_threshold", 50000))
            }
        except Exception:
            return defaults

    def check_and_publish_jackpot(self, db: Session, user_id: int, game_type: str, amount: int):
        """Check thresholds and publish if eligible."""
        try:
            # Optimization: Quick pass for small amounts
            if amount < 5000:
                return

            config = self.get_jackpot_config(db)
            threshold = config.get("threshold", 10000)
            
            if amount < threshold:
                return

            mega_threshold = config.get("mega_threshold", 50000)
            is_mega = amount >= mega_threshold

            self.publish_jackpot(db, user_id, game_type, amount, is_mega)
        except Exception as e:
             logger.error(f"Error checking jackpot publish: {e}")

    def publish_jackpot(self, db: Session, user_id: int, game_type: str, amount: int, is_mega: bool = False):
        """Publish a jackpot win event to the public feed."""
        try:
            client = self.get_redis_client()
            if not client:
                return

            user = db.execute(select(User.nickname).where(User.id == user_id)).first()
            nickname = user.nickname if user and user.nickname else f"User{user_id}"
            masked_nickname = self._mask_nickname(nickname)
            
            payload = {
                "type": "JACKPOT_WIN",
                "payload": {
                    "nickname": masked_nickname,
                    "game_type": game_type,
                    "reward_amount": amount,
                    "is_mega": is_mega
                }
            }
            self._publish(client, payload)
        except Exception as e:
            logger.error(f"Error publishing jackpot: {e}")

    def _mask_nickname(self, nickname: str) -> str:
        if not nickname:
            return "User****"
        if len(nickname) <= 2:
            return nickname[0] + "*"
        return nickname[:2] + "*" * (len(nickname) - 2)

    def _publish(self, client: redis.Redis, message: dict):
        envelope = {
            "type": message["type"],
            "timestamp": int(datetime.utcnow().timestamp() * 1000),
            "id": str(uuid.uuid4()),
            "payload": message["payload"]
        }
        client.publish("feed:public", json.dumps(envelope, ensure_ascii=False))

    def publish_guerrilla_drop(self, multiplier: float):
        """Publish a guerrilla drop (Golden Hour) event to the public feed."""
        try:
            client = self.get_redis_client()
            if not client:
                return

            payload = {
                "type": "GUERRILLA_DROP",
                "payload": {
                    "multiplier": multiplier
                }
            }
            self._publish(client, payload)
        except Exception as e:
            logger.error(f"Error publishing guerrilla drop: {e}")
