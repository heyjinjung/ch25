"""Core level/XP service for global rewards (non-seasonal)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.level_xp import UserLevelProgress, UserLevelRewardLog, UserXpEventLog
from app.services.reward_service import RewardService


class LevelXPService:
    """Maintain user-level XP and issue rewards idempotently."""

    # Baseline core level table (sorted ascending)
    LEVELS: List[Dict[str, Any]] = [
        {"level": 1, "required_xp": 40, "reward_type": "TICKET_ROULETTE", "reward_payload": {"tickets": 1}, "auto_grant": True},
        {"level": 2, "required_xp": 100, "reward_type": "TICKET_DICE", "reward_payload": {"tickets": 2}, "auto_grant": True},
        {"level": 3, "required_xp": 180, "reward_type": "TICKET_LOTTERY", "reward_payload": {"tickets": 2}, "auto_grant": True},
        {"level": 4, "required_xp": 300, "reward_type": "COUPON_CONVENIENCE", "reward_payload": {"amount": 10000, "currency": "KRW"}, "auto_grant": False},
        {"level": 5, "required_xp": 450, "reward_type": "TICKET_ROULETTE", "reward_payload": {"tickets": 3}, "auto_grant": True},
        {"level": 6, "required_xp": 600, "reward_type": "TICKET_LOTTERY", "reward_payload": {"tickets": 3}, "auto_grant": True},
        {"level": 7, "required_xp": 1000, "reward_type": "COUPON_BAEMIN", "reward_payload": {"amount": 20000, "currency": "KRW"}, "auto_grant": False},
    ]

    def __init__(self) -> None:
        self.reward_service = RewardService()

    def _get_or_create_progress(self, db: Session, user_id: int) -> UserLevelProgress:
        progress = db.get(UserLevelProgress, user_id)
        if progress:
            return progress
        progress = UserLevelProgress(user_id=user_id, level=1, xp=0)
        db.add(progress)
        db.flush()
        return progress

    def _log_event(self, db: Session, user_id: int, source: str, delta: int, meta: dict | None) -> None:
        event = UserXpEventLog(user_id=user_id, source=source, delta=delta, meta=meta or {})
        db.add(event)

    def add_xp(self, db: Session, user_id: int, delta: int, source: str, meta: dict | None = None) -> dict:
        """Increment XP, log event, and emit reward logs for newly reached levels.

        Returns a payload summarizing added XP and any new reward logs (does not commit).
        """

        if delta <= 0:
            return {"added_xp": 0, "new_rewards": []}

        progress = self._get_or_create_progress(db, user_id)
        self._log_event(db, user_id=user_id, source=source, delta=delta, meta=meta)

        progress.xp += delta
        progress.updated_at = datetime.utcnow()

        # Determine newly achieved levels
        achieved = []
        current_level = progress.level
        for row in self.LEVELS:
            if progress.xp < row["required_xp"]:
                break
            current_level = max(current_level, row["level"])
            # Check duplicate reward
            existing = db.execute(
                select(UserLevelRewardLog).where(
                    UserLevelRewardLog.user_id == user_id,
                    UserLevelRewardLog.level == row["level"],
                )
            ).scalar_one_or_none()
            if existing:
                continue
            reward_log = UserLevelRewardLog(
                user_id=user_id,
                level=row["level"],
                reward_type=row["reward_type"],
                reward_payload=row["reward_payload"],
                auto_granted=row["auto_grant"],
            )
            db.add(reward_log)
            achieved.append(
                {
                    "level": row["level"],
                    "reward_type": row["reward_type"],
                    "reward_payload": row["reward_payload"],
                    "auto_granted": row["auto_grant"],
                }
            )
            # Auto grant only for coupon/point types supported by RewardService
            if row["auto_grant"] and row["reward_type"].startswith("COUPON"):
                reward_meta = {"source": source, "level": row["level"], **(row["reward_payload"] or {})}
                try:
                    self.reward_service.grant_coupon(db, user_id=user_id, coupon_type=row["reward_type"], meta=reward_meta)
                except Exception:
                    # Delivery errors should not break XP accrual; rely on logs for retries.
                    pass
        progress.level = current_level
        return {"added_xp": delta, "new_rewards": achieved, "level": progress.level, "xp": progress.xp}
