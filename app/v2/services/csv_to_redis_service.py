"""CSV-to-Redis event transformation service."""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Optional

import redis

from app.core.config import get_settings
from app.v2.schemas.v2_csv_import import ExternalCasinoGameLogCSV

logger = logging.getLogger(__name__)

# Redis channels
GAME_EVENT_CHANNEL = "golden:v2:events:game"
CSV_IMPORT_CHANNEL = "golden:v2:events:csv_import"


class CSVToRedisService:
    """Transform CSV records into Redis events for Golden intervention system."""

    def __init__(self):
        self._redis_client: Optional[redis.Redis] = None

    @property
    def redis_client(self) -> Optional[redis.Redis]:
        """Get or create Redis client."""
        if self._redis_client is not None:
            return self._redis_client

        settings = get_settings()
        if not settings.redis_url:
            logger.warning("Redis URL not configured")
            return None

        try:
            self._redis_client = redis.from_url(settings.redis_url, decode_responses=True)
            # Test connection
            self._redis_client.ping()
            return self._redis_client
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to connect to Redis", exc_info=exc)
            return None

    def csv_record_to_game_event(
        self,
        record: ExternalCasinoGameLogCSV,
        source: str = "csv_import",
    ) -> dict[str, Any]:
        """
        Convert CSV record to Golden V2 game event format.

        Args:
            record: Parsed CSV record
            source: Event source identifier

        Returns:
            Game event payload
        """
        event_id = f"csv_{uuid.uuid4().hex[:12]}"

        payload: dict[str, Any] = {
            "event_id": event_id,
            "user_id": record.user_id,
            "timestamp": record.timestamp.isoformat(),
            "source": source,
            "game_type": record.game_type.value,
            "result": record.result.value,
            "bet_amount": record.bet_amount,
            "payout_amount": record.payout_amount,
            "current_balance": record.balance_after,
        }

        # Add optional fields
        if record.external_user_id:
            payload["external_user_id"] = record.external_user_id

        if record.session_id:
            payload["session_id"] = record.session_id

        if record.game_metadata:
            try:
                metadata = json.loads(record.game_metadata)
                payload["game_metadata"] = metadata
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON in game_metadata for event {event_id}")

        return payload

    def publish_game_event(
        self,
        record: ExternalCasinoGameLogCSV,
        historical_mode: bool = False,
    ) -> bool:
        """
        Publish game event to Redis channel.

        Args:
            record: CSV record to publish
            historical_mode: If True, tag event as historical (may skip real-time triggers)

        Returns:
            True if published successfully
        """
        client = self.redis_client
        if not client:
            return False

        try:
            payload = self.csv_record_to_game_event(record)

            # Tag historical events
            if historical_mode:
                payload["is_historical"] = True

            # Publish to game events channel
            client.publish(GAME_EVENT_CHANNEL, json.dumps(payload, ensure_ascii=False))

            logger.debug(
                f"Published game event for user {record.user_id}: "
                f"{record.game_type.value} {record.result.value}"
            )

            return True

        except Exception as exc:  # noqa: BLE001
            logger.error(f"Failed to publish game event for user {record.user_id}", exc_info=exc)
            return False

    def publish_batch(
        self,
        records: list[ExternalCasinoGameLogCSV],
        historical_mode: bool = False,
    ) -> tuple[int, int]:
        """
        Publish batch of records to Redis.

        Args:
            records: List of CSV records
            historical_mode: Historical mode flag

        Returns:
            Tuple of (successful_count, failed_count)
        """
        successful = 0
        failed = 0

        for record in records:
            if self.publish_game_event(record, historical_mode):
                successful += 1
            else:
                failed += 1

        return successful, failed

    def update_loss_streak_redis(
        self,
        user_id: int,
        result: str,
    ) -> None:
        """
        Update user loss streak counter in Redis.

        Args:
            user_id: User ID
            result: Game result (WIN, LOSE, etc.)
        """
        client = self.redis_client
        if not client:
            return

        try:
            loss_key = f"golden:v2:user:{user_id}:loss_streak"

            if result == "LOSE":
                # Increment loss streak
                client.incr(loss_key)
                # Set TTL to 24 hours
                client.expire(loss_key, 86400)
            else:
                # Reset loss streak on non-LOSE result
                client.delete(loss_key)

        except Exception as exc:  # noqa: BLE001
            logger.error(f"Failed to update loss streak for user {user_id}", exc_info=exc)

    def track_session_balance(
        self,
        user_id: int,
        balance: float,
    ) -> None:
        """
        Track session start balance for balance drop detection.

        Args:
            user_id: User ID
            balance: Current balance
        """
        client = self.redis_client
        if not client:
            return

        try:
            session_key = f"golden:v2:user:{user_id}:session_start_balance"

            # Only set if not exists (preserve session start)
            client.setnx(session_key, int(balance))
            # Set TTL to 24 hours
            client.expire(session_key, 86400)

        except Exception as exc:  # noqa: BLE001
            logger.error(f"Failed to track session balance for user {user_id}", exc_info=exc)

    def publish_import_status(
        self,
        job_id: str,
        status: str,
        progress: dict[str, Any],
    ) -> bool:
        """
        Publish CSV import status event.

        Args:
            job_id: Import job ID
            status: Job status (PROCESSING, COMPLETED, FAILED)
            progress: Progress information

        Returns:
            True if published successfully
        """
        client = self.redis_client
        if not client:
            return False

        try:
            payload = {
                "job_id": job_id,
                "status": status,
                "timestamp": datetime.utcnow().isoformat(),
                **progress,
            }

            client.publish(CSV_IMPORT_CHANNEL, json.dumps(payload, ensure_ascii=False))
            return True

        except Exception as exc:  # noqa: BLE001
            logger.error(f"Failed to publish import status for job {job_id}", exc_info=exc)
            return False

    def cleanup(self) -> None:
        """Close Redis connection."""
        if self._redis_client:
            try:
                self._redis_client.close()
            except Exception:  # noqa: BLE001, S110
                pass
            self._redis_client = None
