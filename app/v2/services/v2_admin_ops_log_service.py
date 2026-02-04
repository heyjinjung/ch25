"""V2 Service layer for admin ops logging."""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime, date
from typing import Any, Dict, List, Optional, Tuple, Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.v2.models import OpsDailyLog, OpsLogEntry

logger = logging.getLogger(__name__)

# Core allowlist
ALLOWED_ACTION_CODES: set[str] = {
    "ADMIN_MANUAL_GRANT",
    "ANALYSIS_RETENTION_GAP_RECORDED",
    "AUDIT_INVENTORY_REVIEW",
    "CS_DM_TEMPLATE_USED",
    "CS_SEND_LINK",
    "CS_SURVEY_DM",
    "CS_SURVEY_DM_SENT",
    "CS_SURVEY_RESPONSE_RECORDED",
    "EXP_AB_ASSIGNED",
    "EXP_AB_LIFECYCLE_UPDATED",
    "FEED_EVENT_PUBLISHED",
    "GAME_PLAY_RECORDED",
    "MARKETING_BROADCAST_SENT",
    "NOTIFICATION_DISPATCHED",
    "OFFER_PERSONALIZED_TRACKED",
    "OPS_ROUTINE_CHECKED",
    "OPS_SCHEDULE_UPDATED",
    "SEGMENT_BULK_ACTION_EXECUTED",
    "SEGMENT_QUERY_EXECUTED",
    "SESSION_EXTENSION_NUDGED",
    "SOCIAL_PROOF_PUBLISHED",
    "SYS_DEPOSIT_XP_RULE_UPDATED",
    "SYS_GAME_BASE_XP_UPDATED",
    "SYS_GOLDEN_HOUR_MULTIPLIER_SET",
    "SYS_GOLDEN_HOUR_TOGGLE",
    "SYS_JACKPOT_DRAW_PAYOUT",
    "SYS_JACKPOT_POOL_INCREMENT",
    "SYS_LEADERBOARD_RULE_UPDATED",
    "SYS_LOSS_RECOVERY_PAYOUT",
    "SYS_MISSION_MACRO_UPDATED",
    "SYS_MYSTERY_REWARD_RULE_UPDATED",
    "SYS_NEAR_MISS_TOGGLE",
    "SYS_TRIAL_GRANT_POLICY_UPDATED",
    "SYS_VIP_TIER_RULE_UPDATED",
    "SYS_WEEKLY_CASHBACK_PAYOUT",
    "SYS_WIN_STREAK_RULE_UPDATED",
    "SYS_WELCOME_EXPOSURE_UPDATED",
    "USER_ACHIEVEMENT_UNLOCKED",
    "USER_DAILY_SPIN",
    "USER_GRANT_SURVEY_REWARD",
    "USER_MISSION_MACRO_REWARD",
    "USER_TRIAL_GRANT",
    "USER_VIP_TIER_CHANGED",
    "USER_WIN_STREAK_REWARD",
    "LOSS_RECOVERY_PAYOUT",
}

ROLE_LEVEL = {"OPERATOR": 1, "MANAGER": 2, "ADMIN": 3}

META_REQUIRED_FIELDS: dict[str, List[str]] = {
    "PAYOUT": ["assets"],
    "SYSTEM_EVENT": [],
    "ROUTINE": [],
    "CS_DM": ["channel", "status"],
    "MARKETING_BROADCAST": ["channel", "campaign_id"],
    "SEGMENT_ACTION": ["segment_key", "result_count"],
    "SURVEY": ["survey_id", "reward"],
    "EXPERIMENT_AB": ["experiment_id", "variant"],
    "JACKPOT_EVENT": ["jackpot_id", "pool_after"],
    "LOSS_RECOVERY_PAYOUT": ["amount", "policy"],
    "DAILY_SPIN": ["spin_result", "reward"],
    "ACHIEVEMENT_UNLOCKED": ["badge_key", "reward"],
}

_PHONE_PATTERN = re.compile(r"(\d{3})[- ]?(\d{3,4})[- ]?(\d{4})")
_EMAIL_PATTERN = re.compile(r"([\w.+-]+)@([\w.-]+)")
_ACCOUNT_PATTERN = re.compile(r"(account|acct|계좌)\s*[:=]?\s*\d{6,}", re.IGNORECASE)
_ADDRESS_PATTERN = re.compile(r"(도로명|주소|street|st\.)", re.IGNORECASE)


class V2AdminOpsLogService:
    """V2 Service following RTP v13 standards."""

    @staticmethod
    def _mask_string(value: str) -> str:
        value = _PHONE_PATTERN.sub(r"***-****-****", value)
        value = _EMAIL_PATTERN.sub(r"***@***", value)
        value = _ACCOUNT_PATTERN.sub("***ACCOUNT***", value)
        if _ADDRESS_PATTERN.search(value):
            value = _ADDRESS_PATTERN.sub("***ADDR***", value)
        return value

    @staticmethod
    def _mask_obj(obj: Any) -> Any:
        if isinstance(obj, str):
            return V2AdminOpsLogService._mask_string(obj)
        if isinstance(obj, list):
            return [V2AdminOpsLogService._mask_obj(v) for v in obj]
        if isinstance(obj, dict):
            return {k: V2AdminOpsLogService._mask_obj(v) for k, v in obj.items()}
        return obj

    @staticmethod
    def _redis():
        try:
            import redis
            settings = get_settings()
            if not settings.redis_url:
                return None
            return redis.from_url(settings.redis_url, decode_responses=True)
        except Exception:
            return None

    @staticmethod
    def create_log_entry(
        db: Session,
        *,
        log_date: date,
        category: str,
        action_code: str,
        target_model: str,
        target_id: Optional[str],
        meta_data: Dict[str, Any],
        is_automated: bool,
        actor_id: int,
        ref_id: Optional[str] = None,
    ) -> OpsLogEntry:
        # Validate logic (simplified for V2 port)
        masked_meta = V2AdminOpsLogService._mask_obj(meta_data or {})

        # Ensure daily log
        daily = db.get(OpsDailyLog, log_date)
        if not daily:
            daily = OpsDailyLog(date=log_date, status="DRAFT")
            db.add(daily)
            db.flush()

        entry = OpsLogEntry(
            daily_log_date=log_date,
            timestamp=datetime.utcnow(),
            category=category,
            action_code=action_code,
            target_model=target_model,
            target_id=target_id,
            meta_data=masked_meta,
            is_automated=is_automated,
            actor_id=actor_id,
            ref_id=ref_id,
        )
        db.add(entry)
        db.flush()

        # Broadcast if needed
        V2AdminOpsLogService._broadcast_if_needed(action_code, entry)

        return entry

    @staticmethod
    def _broadcast_if_needed(action_code: str, entry: OpsLogEntry):
        # Basic trigger set for MVP
        ws_broadcast_triggers = {
            "OPS_ROUTINE_CHECKED",
            "SYS_GOLDEN_HOUR_TOGGLE",
            "SYS_GOLDEN_HOUR_MULTIPLIER_SET",
        }
        if action_code in ws_broadcast_triggers:
            client = V2AdminOpsLogService._redis()
            if client:
                payload = {
                    "type": "ops_log",
                    "action_code": entry.action_code,
                    "target_model": entry.target_model,
                    "target_id": entry.target_id,
                    "meta_data": entry.meta_data,
                    "timestamp": entry.timestamp.isoformat() if entry.timestamp else None,
                }
                try:
                    client.publish("ops:ws", json.dumps(payload, ensure_ascii=False))
                except Exception:
                    pass
