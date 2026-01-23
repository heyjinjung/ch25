"""V2 Idempotency wrapper that delegates to V1 IdempotencyService.

This is a minimal compatibility shim to allow v2 code to import idempotency
from `app.v2.services.idempotency_service` while using existing v1 implementation.
"""
from __future__ import annotations

from typing import Any, Optional, Tuple

from app.services.idempotency_service import IdempotencyService as _V1IdempotencyService


class IdempotencyService:
    @staticmethod
    def begin(db, **kwargs) -> Tuple[Optional[dict], Optional[dict]]:
        """Begin an idempotency record.

        Delegates to the existing v1 service.
        """
        return _V1IdempotencyService.begin(db, **kwargs)

    @staticmethod
    def complete(db, *, record: Any, response_payload: dict) -> None:
        """Complete an idempotency record with response payload."""
        return _V1IdempotencyService.complete(db, record=record, response_payload=response_payload)
