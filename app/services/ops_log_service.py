"""Service layer for admin ops logging."""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime, date
from typing import Any, Dict, Iterable, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.ops_log import OpsDailyLog, OpsLogEntry

logger = logging.getLogger(__name__)

# Core allowlist (RTP v13.0 매핑 기반)
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
    # System/default는 필수 필드 없이 허용
    "SYSTEM_EVENT": [],
    # 일상 점검은 슬롯 등 자유롭게 기록 (필수 없음)
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


class OpsLogService:
    """Encapsulates ops log persistence and basic validation."""

    def __init__(self) -> None:
        self.now = datetime.utcnow
        self._redis_client = None

    def _mask_string(self, value: str) -> str:
        value = _PHONE_PATTERN.sub(r"***-****-****", value)
        value = _EMAIL_PATTERN.sub(r"***@***", value)
        value = _ACCOUNT_PATTERN.sub("***ACCOUNT***", value)
        if _ADDRESS_PATTERN.search(value):
            value = _ADDRESS_PATTERN.sub("***ADDR***", value)
        return value

    def _mask_obj(self, obj: Any) -> Any:
        if isinstance(obj, str):
            return self._mask_string(obj)
        if isinstance(obj, list):
            return [self._mask_obj(v) for v in obj]
        if isinstance(obj, dict):
            return {k: self._mask_obj(v) for k, v in obj.items()}
        return obj

    def _redis(self):
        if self._redis_client is False:
            return None
        if self._redis_client is not None:
            return self._redis_client
        try:
            import redis
        except ImportError:
            logger.warning("redis not installed; outbox/ws disabled")
            self._redis_client = False
            return None
        settings = get_settings()
        if not settings.redis_url:
            logger.warning("redis_url not configured; outbox/ws disabled")
            self._redis_client = False
            return None
        try:
            self._redis_client = redis.from_url(settings.redis_url, decode_responses=True)
            # test connection
            self._redis_client.ping()
            return self._redis_client
        except Exception as exc:  # noqa: BLE001
            logger.warning("redis connection failed; outbox/ws disabled", exc_info=exc)
            self._redis_client = False
            return None

    def _validate_action_code(self, action_code: str) -> None:
        if action_code not in ALLOWED_ACTION_CODES:
            raise ValueError("ACTION_CODE_INVALID")

    def _infer_meta_type(self, action_code: str) -> str:
        if action_code.startswith("USER_GRANT") or "PAYOUT" in action_code:
            return "PAYOUT"
        if action_code.startswith("SYS_"):
            return "SYSTEM_EVENT"
        if action_code.startswith("ADMIN_"):
            return "PAYOUT"
        if action_code.startswith("OPS_"):
            return "ROUTINE"
        if action_code.startswith("CS_"):
            return "CS_DM"
        if action_code.startswith("MARKETING_"):
            return "MARKETING_BROADCAST"
        if action_code.startswith("SEGMENT_"):
            return "SEGMENT_ACTION"
        if "SURVEY" in action_code:
            return "SURVEY"
        if action_code.startswith("EXP_"):
            return "EXPERIMENT_AB"
        if "JACKPOT" in action_code:
            return "JACKPOT_EVENT"
        if "DAILY_SPIN" in action_code or "SPIN" in action_code:
            return "DAILY_SPIN"
        if "ACHIEVEMENT" in action_code:
            return "ACHIEVEMENT_UNLOCKED"
        if action_code.startswith("NOTIFICATION") or "NUDGE" in action_code:
            return "NOTIFICATION_DISPATCH"
        return "SYSTEM_EVENT"

    def required_role(self, action_code: str) -> str:
        if action_code.startswith(("MARKETING_", "NOTIFICATION", "EXP_")):
            return "ADMIN"
        if action_code.startswith(
            (
                "SEGMENT_",
                "ADMIN_",
                "SYS_LOSS_RECOVERY",
                "SYS_WEEKLY_CASHBACK",
                "SYS_JACKPOT_DRAW",
                "USER_TRIAL_GRANT",
                "USER_WIN_STREAK_REWARD",
                "USER_GRANT",
                "PAYOUT",
            )
        ):
            return "MANAGER"
        return "OPERATOR"

    def has_role(self, current_role: str, required_role: str) -> bool:
        return ROLE_LEVEL.get(current_role, 0) >= ROLE_LEVEL.get(required_role, 0)

    def requires_confirm(self, action_code: str) -> bool:
        confirm_set = {
            "SEGMENT_BULK_ACTION_EXECUTED",
            "MARKETING_BROADCAST_SENT",
            "NOTIFICATION_DISPATCHED",
            "ADMIN_MANUAL_GRANT",
            "SYS_JACKPOT_DRAW_PAYOUT",
            "SYS_LOSS_RECOVERY_PAYOUT",
            "SYS_WEEKLY_CASHBACK_PAYOUT",
        }
        if action_code in confirm_set:
            return True
        return action_code.startswith(
            (
                "PAYOUT",
                "SEGMENT_",
                "MARKETING_",
                "NOTIFICATION",
                "ADMIN_",
                "SYS_LOSS_RECOVERY",
                "SYS_WEEKLY_CASHBACK",
                "SYS_JACKPOT_DRAW",
            )
        )

    def should_enqueue_outbox(self, action_code: str) -> bool:
        return action_code.startswith(
            (
                "PAYOUT",
                "SEGMENT_",
                "MARKETING_",
                "NOTIFICATION",
                "SYS_LOSS_RECOVERY",
                "SYS_WEEKLY_CASHBACK",
                "SYS_JACKPOT_DRAW",
            )
        ) or action_code in {
            "ADMIN_MANUAL_GRANT",
            "SYS_LOSS_RECOVERY_PAYOUT",
            "SYS_WEEKLY_CASHBACK_PAYOUT",
            "SYS_JACKPOT_DRAW_PAYOUT",
        }

    def should_broadcast_ws(self, action_code: str) -> bool:
        return action_code.startswith(
            (
                "OPS_ROUTINE_CHECKED",
                "SYS_GOLDEN_HOUR_",
                "SEGMENT_",
                "MARKETING_",
                "NOTIFICATION",
                "CS_",
                "PAYOUT",
                "EXP_",
                "JACKPOT",
            )
        ) or action_code in {"USER_ACHIEVEMENT_UNLOCKED", "USER_DAILY_SPIN"}

    def build_event_payload(self, entry: OpsLogEntry) -> Dict[str, Any]:
        return {
            "id": entry.id,
            "action_code": entry.action_code,
            "category": entry.category,
            "target_model": entry.target_model,
            "target_id": entry.target_id,
            "meta_data": entry.meta_data,
            "actor_id": entry.actor_id,
            "ref_id": entry.ref_id,
            "timestamp": entry.timestamp.isoformat() if entry.timestamp else None,
            "date": entry.daily_log_date.isoformat() if entry.daily_log_date else None,
        }

    def enqueue_outbox(self, payload: Dict[str, Any]) -> None:
        client = self._redis()
        if not client:
            logger.info("ops_outbox_event_skipped_no_redis", extra={"event": payload})
            return
        try:
            client.rpush("ops:outbox", json.dumps(payload, ensure_ascii=False))
        except Exception as exc:  # noqa: BLE001
            logger.warning("ops_outbox_event_enqueue_failed", exc_info=exc, extra={"event": payload})
        else:
            logger.info("ops_outbox_event_enqueued", extra={"event": payload})

    def broadcast_ws(self, payload: Dict[str, Any]) -> None:
        client = self._redis()
        if not client:
            logger.info("ops_ws_event_skipped_no_redis", extra={"event": payload})
            return
        try:
            client.publish("ops:ws", json.dumps(payload, ensure_ascii=False))
        except Exception as exc:  # noqa: BLE001
            logger.warning("ops_ws_event_publish_failed", exc_info=exc, extra={"event": payload})
        else:
            logger.info("ops_ws_event_published", extra={"event": payload})

    def _validate_meta_schema(self, meta_data: Dict[str, Any], meta_type: str) -> None:
        if not isinstance(meta_data, dict):
            raise ValueError("META_DATA_INVALID")
        if meta_type == "SYSTEM_EVENT" and not meta_data:
            raise ValueError("META_DATA_MISSING")
        required = META_REQUIRED_FIELDS.get(meta_type, [])
        missing = [k for k in required if k not in meta_data]
        if missing:
            raise ValueError(f"META_DATA_MISSING:{','.join(missing)}")

    def ensure_daily_log(self, db: Session, log_date: date) -> OpsDailyLog:
        daily = db.get(OpsDailyLog, log_date)
        if daily:
            return daily
        daily = OpsDailyLog(date=log_date, status="DRAFT")
        db.add(daily)
        db.commit()
        db.refresh(daily)
        return daily

    def create_log_entry(
        self,
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
        ref_id: Optional[str],
    ) -> tuple[OpsLogEntry, bool]:
        self._validate_action_code(action_code)
        meta_type = self._infer_meta_type(action_code)
        self._validate_meta_schema(meta_data or {}, meta_type)
        created = True
        if ref_id:
            existing = db.execute(select(OpsLogEntry).where(OpsLogEntry.ref_id == ref_id)).scalar_one_or_none()
            if existing:
                return existing, False

        self.ensure_daily_log(db, log_date)

        masked_meta = self._mask_obj(meta_data or {})

        entry = OpsLogEntry(
            daily_log_date=log_date,
            timestamp=self.now(),
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
        db.commit()
        db.refresh(entry)
        return entry, created

    def list_entries(
        self,
        db: Session,
        *,
        log_date: date,
        category: Optional[str] = None,
        action_code: Optional[str] = None,
        actor_id: Optional[int] = None,
    ) -> List[OpsLogEntry]:
        q = db.query(OpsLogEntry).filter(OpsLogEntry.daily_log_date == log_date)
        if category:
            q = q.filter(OpsLogEntry.category == category)
        if action_code:
            q = q.filter(OpsLogEntry.action_code == action_code)
        if actor_id:
            q = q.filter(OpsLogEntry.actor_id == actor_id)
        return q.order_by(OpsLogEntry.timestamp.desc(), OpsLogEntry.id.desc()).all()

    def export_daily_log(self, entries: Iterable[OpsLogEntry], log_date: date) -> Dict[str, str]:
        lines: List[str] = []
        header = f"# 운영 일지 {log_date.isoformat()}\n"
        lines.append(header)
        for e in entries:
            ts = e.timestamp.isoformat() if e.timestamp else ""
            meta_str = json.dumps(e.meta_data or {}, ensure_ascii=False, sort_keys=True)
            lines.append(f"- [{ts}] {e.category} {e.action_code} target={e.target_model}:{e.target_id or '-'} actor={e.actor_id} automated={e.is_automated} ref={e.ref_id or '-'}\n  meta: {meta_str}\n")
        content_md = "\n".join(lines)
        # Use ASCII-safe filename for HTTP headers; keep content in body.
        filename = f"{log_date.strftime('%Y%m%d')}_ops_log.md"
        return {"filename": filename, "content_md": content_md}
