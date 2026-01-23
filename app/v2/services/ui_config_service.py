"""V2 UiConfig wrapper that delegates to V1 UiConfigService.

Minimal shim so v2 code imports `app.v2.services.ui_config_service.UiConfigService`
while delegating to existing v1 implementation until a full v2 implementation is ready.
"""
from __future__ import annotations

from typing import Any, Optional

from app.services.ui_config_service import UiConfigService as _V1UiConfigService


class UiConfigService:
    @staticmethod
    def get(db, key: str) -> Optional[Any]:
        return _V1UiConfigService.get(db, key)

    @staticmethod
    def upsert(db, key: str, value: dict, admin_id: int | None = None) -> Any:
        return _V1UiConfigService.upsert(db, key, value, admin_id=admin_id)
