"""V2 FeatureService no-op shim.

This file provides a minimal, always-allow `FeatureService` implementation for v2
so that game engines no longer import the V1 `app.services.feature_service`.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

from app.core.exceptions import NoFeatureTodayError

class FeatureService:
    def validate_feature_active(self, db, op_date: date, feature_type: Any) -> None:
        """No-op: always consider features active for v2 (legacy feature gating removed)."""
        return None

    def get_today_feature(self, db, now_kst: datetime) -> Any:
        """Return today's feature for v2.

        V2 no longer uses the legacy 'feature of the day' schedule.
        Keep the endpoint stable by reporting 'no feature today'.
        """

        raise NoFeatureTodayError()


__all__ = ["FeatureService"]
