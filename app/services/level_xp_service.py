"""Core level/XP service for global rewards (non-seasonal)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.game_wallet import GameTokenType
from app.models.level_xp import UserLevelProgress, UserLevelRewardLog, UserXpEventLog
from app.services.reward_service import RewardService


class LevelXPService:
    """Maintain user-level XP and issue rewards idempotently."""

    # Baseline core level table (sorted ascending)
    LEVELS: List[Dict[str, Any]] = [
        {"level": 1, "required_xp": 20, "reward_type": "TICKET_ROULETTE", "reward_payload": {"tickets": 1}, "auto_grant": True},
        {"level": 2, "required_xp": 50, "reward_type": "TICKET_DICE", "reward_payload": {"tickets": 1}, "auto_grant": True},
        {"level": 3, "required_xp": 100, "reward_type": "TICKET_MIX", "reward_payload": {"tickets": {"ROULETTE": 1, "DICE": 1}}, "auto_grant": True},
        {"level": 4, "required_xp": 180, "reward_type": "TICKET_LOTTERY", "reward_payload": {"tickets": 1}, "auto_grant": True},
        {"level": 5, "required_xp": 300, "reward_type": "TICKET_CC_COIN", "reward_payload": {"amount": 1}, "auto_grant": False},
        {"level": 6, "required_xp": 450, "reward_type": "TICKET_MIX", "reward_payload": {"tickets": {"DICE": 2, "LOTTERY": 1}}, "auto_grant": False},
        {"level": 7, "required_xp": 650, "reward_type": "TICKET_CC_COIN", "reward_payload": {"amount": 2}, "auto_grant": False},
        {"level": 8, "required_xp": 900, "reward_type": "COUPON_COUPANG", "reward_payload": {"amount": 10000, "currency": "KRW"}, "auto_grant": False},
        {"level": 9, "required_xp": 1200, "reward_type": "POINT_CC", "reward_payload": {"amount": 20000}, "auto_grant": False},
        {"level": 10, "required_xp": 1600, "reward_type": "POINT_CC", "reward_payload": {"amount": 50000}, "auto_grant": False},
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
            # Auto grant only for supported reward types; non-blocking
            if row["auto_grant"]:
                reward_meta = {"source": source, "level": row["level"], **(row["reward_payload"] or {})}
                try:
                    if row["reward_type"].startswith("COUPON"):
                        self.reward_service.grant_coupon(db, user_id=user_id, coupon_type=row["reward_type"], meta=reward_meta)
                    elif row["reward_type"] == "TICKET_MIX":
                        payload = row.get("reward_payload") or {}
                        tickets = payload.get("tickets") or {}
                        ticket_map = {
                            "ROULETTE": GameTokenType.ROULETTE_COIN,
                            "DICE": GameTokenType.DICE_TOKEN,
                            "LOTTERY": GameTokenType.LOTTERY_TICKET,
                        }
                        for key, amt in tickets.items():
                            token_type = ticket_map.get(key)
                            if token_type and amt > 0:
                                self.reward_service.grant_ticket(db, user_id=user_id, token_type=token_type, amount=amt, meta=reward_meta)
                    elif row["reward_type"].startswith("TICKET"):
                        ticket_map = {
                            "TICKET_ROULETTE": GameTokenType.ROULETTE_COIN,
                            "TICKET_DICE": GameTokenType.DICE_TOKEN,
                            "TICKET_LOTTERY": GameTokenType.LOTTERY_TICKET,
                            "TICKET_CC_COIN": GameTokenType.CC_COIN,
                        }
                        token_type = ticket_map.get(row["reward_type"])
                        payload = row.get("reward_payload") or {}
                        amount = payload.get("tickets") or payload.get("amount") or 0
                        if token_type and amount > 0:
                            self.reward_service.grant_ticket(db, user_id=user_id, token_type=token_type, amount=amount, meta=reward_meta)
                    elif row["reward_type"].startswith("POINT"):
                        payload = row.get("reward_payload") or {}
                        amount = payload.get("amount") or 0
                        if amount > 0:
                            self.reward_service.grant_point(db, user_id=user_id, amount=amount, reason="LEVEL_REWARD", meta=reward_meta)
                except Exception:
                    # Delivery errors should not break XP accrual; rely on logs for retries.
                    pass
        progress.level = current_level
        return {"added_xp": delta, "new_rewards": achieved, "level": progress.level, "xp": progress.xp}

    def get_status(self, db: Session, user_id: int) -> dict:
        """Return current level/XP snapshot and reward history."""

        progress = self._get_or_create_progress(db, user_id=user_id)

        next_row = next((row for row in self.LEVELS if row["required_xp"] > progress.xp), None)
        next_level = next_row["level"] if next_row else None
        next_required = next_row["required_xp"] if next_row else None
        xp_to_next = (next_required - progress.xp) if next_required is not None else None

        reward_logs = (
            db.execute(
                select(UserLevelRewardLog)
                .where(UserLevelRewardLog.user_id == user_id)
                .order_by(UserLevelRewardLog.level)
            )
            .scalars()
            .all()
        )

        rewards = [
            {
                "level": log.level,
                "reward_type": log.reward_type,
                "reward_payload": log.reward_payload,
                "auto_granted": log.auto_granted,
                "granted_at": log.created_at,
                "granted_by": log.granted_by,
            }
            for log in reward_logs
        ]

        return {
            "current_level": progress.level,
            "current_xp": progress.xp,
            "next_level": next_level,
            "next_required_xp": next_required,
            "xp_to_next": xp_to_next,
            "rewards": rewards,
        }
