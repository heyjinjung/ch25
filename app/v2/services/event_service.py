"""V2 event service (v2-only).

Implements the logic needed by V2 event status endpoints without importing
legacy (v1) service modules.
"""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.v2.models import EventConfig
from app.v2.models.v2_user_segment import V2UserSegment
from app.v2.models.user import V2User
from app.v2.services.vault2_service import Vault2Service


class V2EventService:
    def is_golden_hour(self, db: Session | None = None, now: datetime | None = None) -> bool:
        now_dt = now or datetime.utcnow()
        if now_dt.tzinfo is None:
            now_dt = now_dt.replace(tzinfo=timezone.utc)

        if db is not None:
            v2 = Vault2Service()
            gh_cfg = v2.get_config_value(db, "golden_hour_config", {})
            if gh_cfg and gh_cfg.get("enabled"):
                override = gh_cfg.get("manual_override", "AUTO")
                if override == "FORCE_ON":
                    return True
                if override == "FORCE_OFF":
                    return False

                settings = get_settings()
                tz = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))
                now_kst = now_dt.astimezone(tz)
                current_time_str = now_kst.strftime("%H:%M:%S")

                start = gh_cfg.get("start_time_kst", "21:30:00")
                end = gh_cfg.get("end_time_kst", "22:30:00")
                if start <= current_time_str <= end:
                    return True

        return False

    def get_golden_hour_status(self, db: Session, now: datetime | None = None) -> dict:
        """Get golden hour status from v2_dice_config (SoT for admin settings)."""
        from app.v2.models.v2_dice import V2DiceConfig
        
        now_dt = now or datetime.utcnow()
        if now_dt.tzinfo is None:
            now_dt = now_dt.replace(tzinfo=timezone.utc)

        settings = get_settings()
        tz = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))
        now_kst = now_dt.astimezone(tz)

        # Get config from v2_dice_config (SoT)
        config = db.query(V2DiceConfig).filter(V2DiceConfig.is_active == True).first()
        
        enabled = bool(getattr(config, "enable_golden_hour", False)) if config else False
        multiplier = float(getattr(config, "golden_hour_multiplier", 2.0) or 2.0) if config else 2.0
        start_str = getattr(config, "golden_hour_start_time", "21:30:00") or "21:30:00" if config else "21:30:00"
        end_str = getattr(config, "golden_hour_end_time", "22:30:00") or "22:30:00" if config else "22:30:00"
        
        start_parts = [int(p) for p in start_str.split(":")]
        end_parts = [int(p) for p in end_str.split(":")]
        start_time_kst = time(start_parts[0], start_parts[1], start_parts[2] if len(start_parts) > 2 else 0)
        end_time_kst = time(end_parts[0], end_parts[1], end_parts[2] if len(end_parts) > 2 else 0)

        def _is_within_window(now_t: time, start_t: time, end_t: time) -> bool:
            if start_t <= end_t:
                return start_t <= now_t <= end_t
            return now_t >= start_t or now_t <= end_t

        active = False
        if enabled:
            active = _is_within_window(now_kst.time(), start_time_kst, end_time_kst)

        # Calculate next_event_time and is_upcoming (within 10 minutes)
        next_event_time = None
        is_upcoming = False
        minutes_until_start = None
        
        if enabled:
            start_dt = now_kst.replace(
                hour=start_time_kst.hour,
                minute=start_time_kst.minute,
                second=start_time_kst.second,
                microsecond=0,
            )
            end_dt = now_kst.replace(
                hour=end_time_kst.hour,
                minute=end_time_kst.minute,
                second=end_time_kst.second,
                microsecond=0,
            )
            if start_time_kst > end_time_kst:
                if now_kst.time() <= end_time_kst:
                    start_dt -= timedelta(days=1)
                else:
                    end_dt += timedelta(days=1)

            if active:
                next_event_time = end_dt
            else:
                if now_kst.time() > end_time_kst and start_time_kst <= end_time_kst:
                    next_event_time = start_dt + timedelta(days=1)
                elif now_kst.time() > end_time_kst and start_time_kst > end_time_kst:
                    next_event_time = start_dt + timedelta(days=1)
                else:
                    next_event_time = start_dt if now_kst.time() <= start_time_kst else start_dt + timedelta(days=1)
            
            # Check if upcoming (within 10 minutes before start)
            if not active and next_event_time:
                time_diff = (next_event_time - now_kst).total_seconds()
                minutes_until_start = int(time_diff / 60)
                if 0 < time_diff <= 600:  # 10 minutes = 600 seconds
                    is_upcoming = True

        return {
            "is_active": active,
            "is_upcoming": is_upcoming,
            "minutes_until_start": minutes_until_start,
            "multiplier": multiplier if active else 1.0,
            "start_time_kst": start_str,
            "end_time_kst": end_str,
            "next_event_time": next_event_time,
            "enabled": enabled,
        }

    def list_active_event_configs(
        self,
        db: Session,
        *,
        now: datetime | None = None,
        segment: str | None = None,
    ) -> list[EventConfig]:
        now_dt = now or datetime.utcnow()
        rows = db.query(EventConfig).filter(EventConfig.is_active.is_(True)).all()
        if not rows:
            return []

        settings = get_settings()
        tz = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))
        now_kst = now_dt.astimezone(tz)

        def _within_window(start_t: time | None, end_t: time | None) -> bool:
            if start_t is None or end_t is None:
                return True
            if start_t <= end_t:
                return start_t <= now_kst.time() <= end_t
            return now_kst.time() >= start_t or now_kst.time() <= end_t

        active: list[EventConfig] = []
        for row in rows:
            if segment and row.target_segment and row.target_segment != segment:
                continue
            if not _within_window(row.start_time, row.end_time):
                continue
            active.append(row)
        return active

    def get_segment_campaign_events(self, db: Session, user_id: int, now: datetime | None = None) -> list[dict]:
        user = db.get(V2User, user_id)
        if not user:
            return []

        segment = db.query(V2UserSegment.segment).filter(V2UserSegment.user_id == user_id).scalar() or "COMMON"
        segment_cfg = (
            db.query(EventConfig)
            .filter(
                EventConfig.event_type == "SEGMENT_CAMPAIGN",
                EventConfig.target_segment == segment,
            )
            .order_by(EventConfig.id.desc())
            .first()
        )
        if segment_cfg is not None and not segment_cfg.is_active:
            return []

        cfg = segment_cfg.config_json if segment_cfg and segment_cfg.config_json else {}
        events: list[dict] = []
        vault_balance = int(getattr(user, "vault_locked_balance", 0) or 0)
        total_charge_amount = int(getattr(user, "total_charge_amount", 0) or 0)

        if segment == "COMMON":
            require_no_deposit = bool(cfg.get("require_no_deposit", True))
            if require_no_deposit and total_charge_amount > 0:
                return events
            vault_threshold = int(cfg.get("vault_balance_threshold", 5000))
            vault_zero_threshold = int(cfg.get("vault_zero_threshold", 0))
            event_codes = cfg.get("event_codes") if isinstance(cfg.get("event_codes"), dict) else {}
            vault_threshold_event = event_codes.get("vault_threshold", "SEGMENT_COMMON_VAULT_5000")
            vault_zero_event = event_codes.get("vault_zero", "SEGMENT_COMMON_VAULT_ZERO")

            if vault_balance >= vault_threshold and total_charge_amount <= 0:
                events.append(
                    {
                        "event_type": vault_threshold_event,
                        "label": "COMMON 5000P ?상성",
                        "meta": {"vault_balance": vault_balance},
                    }
                )
            if vault_balance <= vault_zero_threshold and total_charge_amount <= 0:
                events.append(
                    {
                        "event_type": vault_zero_event,
                        "label": "COMMON 금고 소진",
                        "meta": {"vault_balance": vault_balance},
                    }
                )

        if segment in {"VIP", "WHALE"}:
            if self.is_golden_hour(db=db, now=now):
                golden_hour_event_type = cfg.get("golden_hour_event_type", "SEGMENT_VIP_GOLDEN_HOUR")
                events.append(
                    {
                        "event_type": golden_hour_event_type,
                        "label": "VIP 골든아워",
                    }
                )
            monthly_threshold = int(cfg.get("monthly_charge_threshold", 3_000_000))
            monthly_event_type = cfg.get("monthly_event_type", "SEGMENT_VIP_MONTHLY")
            if total_charge_amount >= monthly_threshold:
                events.append(
                    {
                        "event_type": monthly_event_type,
                        "label": "VIP 월간 미션 조건",
                        "meta": {"total_charge_amount": total_charge_amount},
                    }
                )

        return events
