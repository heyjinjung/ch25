"""V2 FeatureService no-op shim.

This file provides a minimal, always-allow `FeatureService` implementation for v2
so that game engines no longer import the V1 `app.services.feature_service`.
"""
from __future__ import annotations

from datetime import date
from typing import Any


class FeatureService:
    def validate_feature_active(self, db, op_date: date, feature_type: Any) -> None:
        """No-op: always consider features active for v2 (legacy feature gating removed)."""
        return None


__all__ = ["FeatureService"]
