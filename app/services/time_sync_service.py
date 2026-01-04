from datetime import datetime, timezone
from typing import Tuple, Optional
import httpx

from app.core.config import Settings
from app.core.metrics import ntp_preflight_total, ntp_preflight_fail_total, ntp_preflight_drift_ms

class TimeSyncService:
    """Lightweight HTTP-based clock drift checker.

    Uses public time APIs (HTTP) to avoid extra deps. For production, replace with
    a hardened NTP client and internal time sources.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def _parse_remote_time(self, payload: dict) -> Optional[datetime]:
        # worldtimeapi: {'datetime': '2024-01-01T12:34:56.789012+09:00', ...}
        if "datetime" in payload:
            try:
                return datetime.fromisoformat(payload["datetime"])
            except Exception:
                pass
        # timeapi.io: {'dateTime': '2024-01-01T12:34:56.789012+09:00', ...}
        if "dateTime" in payload:
            try:
                return datetime.fromisoformat(payload["dateTime"])
            except Exception:
                pass
        return None

    def check_clock_sync(self) -> Tuple[bool, Optional[float], Optional[str], Optional[str]]:
        """Returns (ok, drift_ms, provider_url, error).

        ok=True when drift is within settings.ntp_allowed_drift_ms.
        """
        allowed_ms = self.settings.ntp_allowed_drift_ms
        timeout = self.settings.ntp_check_timeout
        last_error: Optional[str] = None
        for provider in self.settings.ntp_providers:
            try:
                resp = httpx.get(provider, timeout=timeout)
                resp.raise_for_status()
                remote_dt = self._parse_remote_time(resp.json())
                if not remote_dt:
                    last_error = "unparsable response"
                    ntp_preflight_fail_total.labels(provider=provider).inc()
                    continue
                now = datetime.now(remote_dt.tzinfo or timezone.utc)
                drift_ms = abs((now - remote_dt).total_seconds() * 1000)
                ntp_preflight_total.labels(provider=provider).inc()
                ntp_preflight_drift_ms.observe(drift_ms)
                if drift_ms <= allowed_ms:
                    return True, drift_ms, provider, None
                return False, drift_ms, provider, None
            except Exception as exc:  # pragma: no cover - network variability
                last_error = str(exc)
                ntp_preflight_fail_total.labels(provider=provider).inc()
                continue
        return False, None, None, last_error
