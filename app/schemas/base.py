"""Shared schema utilities.

Policy: All API JSON datetime values are serialized in Asia/Seoul (KST, +09:00).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

from pydantic import BaseModel, model_serializer

KST = ZoneInfo("Asia/Seoul")


def to_kst_datetime(value: datetime) -> datetime:
    """Convert a datetime to KST.

    - If the datetime is naive, it is treated as UTC.
    - Always returns an aware datetime in KST.
    """

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(KST)


def to_kst_iso(value: datetime) -> str:
    """Return ISO8601 string with KST offset (+09:00)."""

    return to_kst_datetime(value).isoformat()


def _convert_datetimes(obj: Any) -> Any:
    if isinstance(obj, datetime):
        return to_kst_datetime(obj)
    if isinstance(obj, dict):
        return {k: _convert_datetimes(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_convert_datetimes(v) for v in obj]
    if isinstance(obj, tuple):
        return tuple(_convert_datetimes(v) for v in obj)
    return obj


class KstBaseModel(BaseModel):
    """Base model that serializes all datetime fields as KST in JSON."""

    @model_serializer(mode="wrap")
    def _serialize_kst(self, handler):
        data = handler(self)
        return _convert_datetimes(data)
