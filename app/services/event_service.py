from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.services.vault2_service import Vault2Service
from app.models.event import EventConfig, EventParticipationLog
from app.models.user import User
from app.models.user_segment import UserSegment

class EventService:
    def is_golden_hour(self, db: Session | None = None, now: datetime | None = None) -> bool:
        """Check if Golden Hour is active."""
        now_dt = now or datetime.utcnow()
        if now_dt.tzinfo is None:
            from datetime import timezone
            now_dt = now_dt.replace(tzinfo=timezone.utc)

        # 1. Check Config via Vault2Service if DB available
        if db is not None:
            v2 = Vault2Service()
            gh_cfg = v2.get_config_value(db, "golden_hour_config", {})
            if gh_cfg and gh_cfg.get("enabled"):
                override = gh_cfg.get("manual_override", "AUTO")
                if override == "FORCE_ON":
                    return True
                if override == "FORCE_OFF":
                    return False
                
                # AUTO: Check KST window
                settings = get_settings()
                tz = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))
                now_kst = now_dt.astimezone(tz)
                current_time_str = now_kst.strftime("%H:%M:%S")
                
                start = gh_cfg.get("start_time_kst", "21:30:00")
                end = gh_cfg.get("end_time_kst", "22:30:00")
                if start <= current_time_str <= end:
                    return True
        
        # 2. Fallback to settings or default if DB not provided or config missing
        # (Assuming mainly controlled via DB now, but keep safe default)
        return False

    def get_golden_hour_status(self, db: Session, now: datetime | None = None) -> dict:
        """Return Golden Hour status payload for UI/API."""
        now_dt = now or datetime.utcnow()
        if now_dt.tzinfo is None:
            from datetime import timezone
            now_dt = now_dt.replace(tzinfo=timezone.utc)

        v2 = Vault2Service()
        gh_cfg = v2.get_config_value(db, "golden_hour_config", {})
        enabled = bool(gh_cfg.get("enabled")) if gh_cfg else False
        override = gh_cfg.get("manual_override", "AUTO") if gh_cfg else "AUTO"
        multiplier = float(gh_cfg.get("multiplier", 1.0)) if gh_cfg else 1.0

        settings = get_settings()
        tz = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))
        now_kst = now_dt.astimezone(tz)

        start_str = gh_cfg.get("start_time_kst", "21:30:00") if gh_cfg else "21:30:00"
        end_str = gh_cfg.get("end_time_kst", "22:30:00") if gh_cfg else "22:30:00"
        start_parts = [int(p) for p in start_str.split(":")]
        end_parts = [int(p) for p in end_str.split(":")]
        start_time_kst = time(start_parts[0], start_parts[1], start_parts[2] if len(start_parts) > 2 else 0)
        end_time_kst = time(end_parts[0], end_parts[1], end_parts[2] if len(end_parts) > 2 else 0)

        def _is_within_window(now_t: time, start_t: time, end_t: time) -> bool:
            if start_t <= end_t:
                return start_t <= now_t <= end_t
            # Cross-midnight window
            return now_t >= start_t or now_t <= end_t

        active = False
        if enabled:
            if override == "FORCE_ON":
                active = True
            elif override == "FORCE_OFF":
                active = False
            else:
                active = _is_within_window(now_kst.time(), start_time_kst, end_time_kst)

        next_event_time = None
        if enabled and override == "AUTO":
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

        return {
            "is_active": active,
            "multiplier": multiplier if active else 1.0,
            "start_time_kst": start_str,
            "end_time_kst": end_str,
            "next_event_time": next_event_time,
            "override": override,
            "enabled": enabled,
        }

    def list_active_event_configs(
        self,
        db: Session,
        *,
        now: datetime | None = None,
        segment: str | None = None,
    ) -> list[EventConfig]:
        """Return active EventConfig rows, filtered by time window and segment."""
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

        active = []
        for row in rows:
            if segment and row.target_segment and row.target_segment != segment:
                continue
            if not _within_window(row.start_time, row.end_time):
                continue
            active.append(row)
        return active

    def get_segment_campaign_events(self, db: Session, user_id: int, now: datetime | None = None) -> list[dict]:
        """Return virtual segment-campaign events for the user."""
        user = db.get(User, user_id)
        if not user:
            return []

        segment = (
            db.query(UserSegment.segment).filter(UserSegment.user_id == user_id).scalar()
            or "COMMON"
        )
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

    def log_participation(
        self,
        db: Session,
        *,
        user_id: int,
        event_type: str,
        event_id: int | None = None,
        reward_type: str | None = None,
        reward_amount: int | None = None,
        meta: dict | None = None,
    ) -> None:
        """Persist event participation log (fail-open)."""
        log = EventParticipationLog(
            user_id=user_id,
            event_id=event_id,
            event_type=event_type,
            reward_type=reward_type,
            reward_amount=reward_amount,
            meta_json=meta or {},
        )
        db.add(log)
        db.flush()

    def safe_log_participation(
        self,
        db: Session,
        *,
        user_id: int,
        event_type: str,
        event_id: int | None = None,
        reward_type: str | None = None,
        reward_amount: int | None = None,
        meta: dict | None = None,
    ) -> None:
        """Fail-open wrapper for logging participation."""
        try:
            self.log_participation(
                db,
                user_id=user_id,
                event_type=event_type,
                event_id=event_id,
                reward_type=reward_type,
                reward_amount=reward_amount,
                meta=meta,
            )
        except Exception:
            # Do not break game flow due to logging.
            return
