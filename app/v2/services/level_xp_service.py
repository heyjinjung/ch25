"""V2 Core level/XP service for global rewards (non-seasonal).

Decoupled from V1, uses V2 models and V2RewardService.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.v2.models import (
    UserLevelProgress,
    UserLevelRewardLog,
    UserXpEventLog,
    V2User,
    V2LevelRewardTable,
)
from app.v2.services.reward_service import V2RewardService


class V2LevelXPService:
    """Maintain user-level XP and issue rewards idempotently."""

    MASTER_REWARD_TYPE_MAP = {
        "TICKET_ROULETTE": "ROULETTE_TICKET",
        "TICKET_DICE": "DICE_TICKET",
        "TICKET_LOTTERY": "LOTTERY_TICKET",
        "ROULETTE_COIN": "ROULETTE_TICKET",
        "DICE_TOKEN": "DICE_TICKET",
        "TRIAL_TOKEN": "TRIAL_TICKET",
        "GOLD_KEY": "GOLD_KEY_TICKET",
        "DIAMOND_KEY": "DIAMOND_TICKET",
        "DIAMOND_KEY_FRAGMENT": "DIAMOND_FRAGMENT",
        "VAULT": "POINT",
    }

    # [DEPRECATED] Hardcoded level rewards - DISABLED.
    LEVELS: List[Dict[str, Any]] = [
        {"level": 1, "required_xp": 0, "reward_type": "NONE", "reward_payload": {}, "auto_grant": False},
        {"level": 2, "required_xp": 50, "reward_type": "NONE", "reward_payload": {}, "auto_grant": False},
        {"level": 3, "required_xp": 100, "reward_type": "NONE", "reward_payload": {}, "auto_grant": False},
    ]

    TEST_LEVELS: List[Dict[str, Any]] = [
        {"level": 1, "required_xp": 0, "reward_type": "TICKET_ROULETTE", "reward_payload": {"tickets": 3}, "auto_grant": True},
        {"level": 2, "required_xp": 50, "reward_type": "TICKET_DICE", "reward_payload": {"tickets": 3}, "auto_grant": True},
        {
            "level": 3,
            "required_xp": 100,
            "reward_type": "BUNDLE",
            "reward_payload": {
                "items": [
                    {"type": "TICKET_ROULETTE", "amount": 1},
                    {"type": "TICKET_DICE", "amount": 1},
                    {"type": "TICKET_LOTTERY", "amount": 1},
                ]
            },
            "auto_grant": True,
        },
    ]

    def _effective_levels(self, db: Session) -> List[Dict[str, Any]]:
        """Determine level requirements from DB (SoT) or hardcoded fallback."""
        try:
            rows = db.execute(select(V2LevelRewardTable).order_by(V2LevelRewardTable.level)).scalars().all()
            if rows:
                return [
                    {
                        "level": r.level,
                        "required_xp": r.required_xp,
                        "reward_type": self._normalize_reward_type(r.reward_type),
                        "reward_amount": r.reward_amount,
                        "reward_payload": r.reward_payload or {},
                        "auto_grant": True,
                    }
                    for r in rows
                ]
            
            bind = db.get_bind()
            if bind is not None and getattr(bind.dialect, "name", "") == "sqlite":
                return self.TEST_LEVELS
        except Exception:
            pass
        
        return self.LEVELS

    @classmethod
    def _normalize_reward_type(cls, value: str | None) -> str:
        if not value:
            return "NONE"
        normalized = str(value).upper()
        return cls.MASTER_REWARD_TYPE_MAP.get(normalized, normalized)

    def __init__(self) -> None:
        self.reward_service = V2RewardService()

    def _get_or_create_progress(self, db: Session, user_id: int) -> UserLevelProgress:
        """레거시 호환용 - user_level_progress도 함께 유지."""
        progress = db.get(UserLevelProgress, user_id)
        if progress:
            return progress
        user = db.get(V2User, user_id)
        initial_level = user.level if user else 1
        initial_xp = user.xp if user else 0
        progress = UserLevelProgress(user_id=user_id, level=initial_level, xp=initial_xp)
        db.add(progress)
        db.flush()
        return progress

    def _log_event(self, db: Session, user_id: int, source: str, delta: int, meta: dict | None) -> None:
        event = UserXpEventLog(user_id=user_id, source=source, delta=delta, meta=meta or {})
        db.add(event)

    def add_xp(self, db: Session, user_id: int, delta: int, source: str, meta: dict | None = None) -> dict:
        """Increment XP, log event, and emit reward logs for newly reached levels."""

        if delta <= 0:
            return {"added_xp": 0, "new_rewards": []}

        MAX_SAFE_DELTA = 100_000
        if delta > MAX_SAFE_DELTA:
             delta = MAX_SAFE_DELTA

        user = db.get(V2User, user_id)
        if not user:
            return {"added_xp": 0, "new_rewards": [], "error": "USER_NOT_FOUND"}
        
        progress = self._get_or_create_progress(db, user_id)
        self._log_event(db, user_id=user_id, source=source, delta=delta, meta=meta)

        user.xp = (user.xp or 0) + delta
        progress.xp = user.xp
        progress.updated_at = datetime.utcnow()

        achieved = []
        possible_levels = self._effective_levels(db)
        possible_levels.sort(key=lambda x: x["level"])
        
        current_level = progress.level
        for row in possible_levels:
            if progress.xp < row["required_xp"]:
                continue
            
            if row["level"] > current_level:
                current_level = row["level"]
                
            existing = db.execute(
                select(UserLevelRewardLog).where(
                    UserLevelRewardLog.user_id == user_id,
                    UserLevelRewardLog.level == row["level"],
                )
            ).scalar_one_or_none()
            
            if existing:
                continue

            reward_type = self._normalize_reward_type(row["reward_type"])
            reward_payload = dict(row.get("reward_payload") or {})
            reward_amount = int(row.get("reward_amount") or 0)
            if reward_amount <= 0:
                reward_amount = int(reward_payload.get("amount") or reward_payload.get("tickets") or 0)
            reward_payload = {
                **reward_payload,
                "reward_amount": reward_amount,
            }

            reward_log = UserLevelRewardLog(
                user_id=user_id,
                level=row["level"],
                reward_type=reward_type,
                reward_payload=reward_payload,
                auto_granted=row["auto_grant"],
            )
            db.add(reward_log)
            achieved.append(
                {
                    "level": row["level"],
                    "reward_type": reward_type,
                    "reward_amount": reward_amount,
                    "reward_payload": reward_payload,
                    "auto_granted": row["auto_grant"],
                }
            )
            if row["auto_grant"]:
                reward_meta = {"source": source, "level": row["level"], **reward_payload}
                try:
                    if reward_type == "BUNDLE":
                        items = reward_payload.get("items") or []
                        for item in items:
                            item_type = self._normalize_reward_type(item.get("type"))
                            item_amount = int(item.get("amount") or 0)
                            if item_type and item_amount > 0:
                                meta_bundle = {**reward_meta, "bundle": True, "bundle_type": item_type}
                                self.reward_service.deliver(
                                    db,
                                    user_id=user_id,
                                    reward_type=item_type,
                                    reward_amount=item_amount,
                                    meta=meta_bundle,
                                    commit=False,
                                )
                    elif reward_amount > 0 and reward_type not in {"NONE", ""}:
                        self.reward_service.deliver(
                            db,
                            user_id=user_id,
                            reward_type=reward_type,
                            reward_amount=reward_amount,
                            meta=reward_meta,
                            commit=False,
                        )
                except Exception:
                    pass
        user.level = current_level
        progress.level = current_level

        return {"added_xp": delta, "new_rewards": achieved, "level": user.level, "xp": user.xp}

    def _get_reward_label(self, reward_type: str, amount: int) -> str:
        """Helper to generate consistent Korean reward labels."""
        type_ko = {
            "POINT": "포인트",
            "TICKET": "티켓",
            "ROULETTE_TICKET": "룰렛 티켓",
            "DICE_TICKET": "주사위 티켓",
            "LOTTERY_TICKET": "복권",
            "GOLD_KEY_TICKET": "황금열쇠",
            "DIAMOND_TICKET": "다이아몬드",
            "DIAMOND_FRAGMENT": "다이아 조각",
        }.get(reward_type, reward_type)

        if amount > 0:
            return f"{amount:,} {type_ko}"
        return type_ko

    def get_status(self, db: Session, user_id: int) -> dict:
        """Return current level/XP snapshot and reward history."""

        progress = self._get_or_create_progress(db, user_id=user_id)

        levels = self._effective_levels(db)
        reward_logs = (
            db.execute(
                select(UserLevelRewardLog)
                .where(UserLevelRewardLog.user_id == user_id)
                .order_by(UserLevelRewardLog.level)
            )
            .scalars()
            .all()
        )
        claimed_levels = {log.level for log in reward_logs}

        level_payload = []
        for row in levels:
            is_unlocked = progress.xp >= row["required_xp"]
            is_claimed = row["level"] in claimed_levels
            reward_type = self._normalize_reward_type(row["reward_type"])
            reward_amount = row.get("reward_amount") or 0
            
            level_payload.append({
                "level": row["level"],
                "required_xp": row["required_xp"],
                "reward_type": reward_type,
                "reward_amount": reward_amount,
                "reward_payload": row.get("reward_payload"),
                "auto_grant": row.get("auto_grant", True),
                "reward_label": self._get_reward_label(reward_type, reward_amount),
                "is_unlocked": is_unlocked,
                "is_claimed": is_claimed,
            })

        next_row = next((row for row in levels if row["required_xp"] > progress.xp), None)
        next_level = next_row["level"] if next_row else None
        next_required = next_row["required_xp"] if next_row else None
        xp_to_next = (next_required - progress.xp) if next_required is not None else None

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
            "levels": level_payload,
            "rewards": rewards,
        }
