"""Core level/XP service for global rewards (non-seasonal)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.level_xp import UserLevelProgress, UserLevelRewardLog, UserXpEventLog
from app.v2.models.user import V2User
from app.v2.models.v2_level_reward import V2LevelRewardTable
from app.services.reward_service import RewardService


class LevelXPService:
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
    # SeasonPass (DB-configured via Admin) is the sole source of truth for level rewards.
    # This legacy table is kept for reference only; auto_grant=False prevents any auto-delivery.
    LEVELS: List[Dict[str, Any]] = [
        {"level": 1, "required_xp": 0, "reward_type": "NONE", "reward_payload": {}, "auto_grant": False},
        {"level": 2, "required_xp": 50, "reward_type": "NONE", "reward_payload": {}, "auto_grant": False},
        {"level": 3, "required_xp": 100, "reward_type": "NONE", "reward_payload": {}, "auto_grant": False},
        {"level": 4, "required_xp": 200, "reward_type": "NONE", "reward_payload": {}, "auto_grant": False},
        {"level": 5, "required_xp": 300, "reward_type": "NONE", "reward_payload": {}, "auto_grant": False},
        {"level": 6, "required_xp": 450, "reward_type": "NONE", "reward_payload": {}, "auto_grant": False},
        {"level": 7, "required_xp": 600, "reward_type": "NONE", "reward_payload": {}, "auto_grant": False},
        {"level": 8, "required_xp": 800, "reward_type": "NONE", "reward_payload": {}, "auto_grant": False},
        {"level": 9, "required_xp": 1000, "reward_type": "NONE", "reward_payload": {}, "auto_grant": False},
    ]

    # sqlite 기반 테스트/시뮬레이션을 위한 최소 글로벌 보상 세트
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
        {"level": 4, "required_xp": 200, "reward_type": "TICKET_LOTTERY", "reward_payload": {"tickets": 3}, "auto_grant": True},
    ]

    def _effective_levels(self, db: Session) -> List[Dict[str, Any]]:
        """Determine level requirements from DB (SoT) or hardcoded fallback."""
        try:
            # 1. Try V2LevelRewardTable (Dynamic SoT)
            rows = db.execute(select(V2LevelRewardTable).order_by(V2LevelRewardTable.level)).scalars().all()
            if rows:
                return [
                    {
                        "level": r.level,
                        "required_xp": r.required_xp,
                        "reward_type": self._normalize_reward_type(r.reward_type),
                        "reward_amount": r.reward_amount,
                        "reward_payload": r.reward_payload or {},
                        "auto_grant": True,  # V2 standard defaults to auto
                    }
                    for r in rows
                ]
            
            # 2. SQLite specific test levels
            bind = db.get_bind()
            if bind is not None and getattr(bind.dialect, "name", "") == "sqlite":
                return self.TEST_LEVELS
        except Exception:
            pass
        
        # 3. Hardcoded Fallback
        return self.LEVELS

    @classmethod
    def _normalize_reward_type(cls, value: str | None) -> str:
        if not value:
            return "NONE"
        normalized = str(value).upper()
        return cls.MASTER_REWARD_TYPE_MAP.get(normalized, normalized)

    def __init__(self) -> None:
        self.reward_service = RewardService()

    def _get_or_create_progress(self, db: Session, user_id: int) -> UserLevelProgress:
        """레거시 호환용 - user_level_progress도 함께 유지.
        
        NOTE: V2 SoT는 v2_user.level/xp이지만, 레거시 호환을 위해
        user_level_progress도 동기화 유지.
        """
        progress = db.get(UserLevelProgress, user_id)
        if progress:
            return progress
        # 신규 생성 시 v2_user 값으로 초기화
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
        """Increment XP, log event, and emit reward logs for newly reached levels.
        
        V2 SoT: v2_user.level/xp를 기준으로 업데이트하고,
        레거시 호환을 위해 user_level_progress도 동기화.

        Returns a payload summarizing added XP and any new reward logs (does not commit).
        """

        if delta <= 0:
            return {"added_xp": 0, "new_rewards": []}

        MAX_SAFE_DELTA = 100_000
        if delta > MAX_SAFE_DELTA:
             # Safety cap to prevent unintentional infinite level usage or exploit
             delta = MAX_SAFE_DELTA

        # V2 SoT: v2_user에서 직접 레벨/XP 관리
        user = db.get(V2User, user_id)
        if not user:
            return {"added_xp": 0, "new_rewards": [], "error": "USER_NOT_FOUND"}
        
        # 레거시 호환: user_level_progress도 함께 유지
        progress = self._get_or_create_progress(db, user_id)
        self._log_event(db, user_id=user_id, source=source, delta=delta, meta=meta)

        # V2 SoT 업데이트
        user.xp = (user.xp or 0) + delta
        progress.xp = user.xp  # 레거시 동기화
        progress.updated_at = datetime.utcnow()

        # Determine newly achieved levels
        achieved = []
        possible_levels = self._effective_levels(db)
        
        # Sort levels to ensure we process them in order
        possible_levels.sort(key=lambda x: x["level"])
        
        current_level = progress.level
        for row in possible_levels:
            if progress.xp < row["required_xp"]:
                continue
            
            # Update current_level to the highest achieved level
            if row["level"] > current_level:
                current_level = row["level"]
                
            # Check duplicate reward
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
            # Auto grant only for supported reward types; non-blocking
            if row["auto_grant"]:
                reward_meta = {"source": source, "level": row["level"], **reward_payload}
                try:
                    if reward_type == "BUNDLE":
                        items = reward_payload.get("items") or []
                        for item in items:
                            item_type = self._normalize_reward_type(item.get("type"))
                            item_amount = int(item.get("amount") or 0)
                            if item_type and item_amount > 0:
                                meta = {**reward_meta, "bundle": True, "bundle_type": item_type}
                                self.reward_service.deliver(
                                    db,
                                    user_id=user_id,
                                    reward_type=item_type,
                                    reward_amount=item_amount,
                                    meta=meta,
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
                    # Delivery errors should not break XP accrual; rely on logs for retries.
                    pass
        # V2 SoT 레벨 업데이트
        user.level = current_level
        progress.level = current_level  # 레거시 동기화

        return {"added_xp": delta, "new_rewards": achieved, "level": user.level, "xp": user.xp}

    def _get_reward_label(self, reward_type: str, amount: int) -> str:
        """Helper to generate consistent Korean reward labels."""
        type_ko = {
            "POINT": "포인트",
            "TICKET": "티켓",
            "ROULETTE_TICKET": "룰렛 티켓",
            "DICE_TICKET": "주사위 티켓",
            "LOTTERY_TICKET": "항권",
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
