from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.services.vault2_service import Vault2Service

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
