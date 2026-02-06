"""
Unit tests for app/schemas/base.py
"""
import pytest
import json
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from app.schemas.base import to_kst_datetime, to_kst_iso, KstBaseModel

KST = ZoneInfo("Asia/Seoul")

def test_to_kst_datetime_naive():
    """Naive datetime should be treated as UTC and converted to KST."""
    # 2026-01-01 00:00:00 (Naive) -> Assumed UTC -> 09:00:00 KST
    naive = datetime(2026, 1, 1, 0, 0, 0)
    kst = to_kst_datetime(naive)
    
    assert kst.tzinfo == KST
    assert kst.year == 2026
    assert kst.month == 1
    assert kst.day == 1
    assert kst.hour == 9  # +9 hours

def test_to_kst_datetime_aware_utc():
    """Aware UTC datetime should be converted to KST."""
    # 2026-01-01 00:00:00 UTC -> 09:00:00 KST
    utc = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    kst = to_kst_datetime(utc)
    
    assert kst.tzinfo == KST
    assert kst.hour == 9

def test_to_kst_datetime_aware_kst():
    """Aware KST datetime should remain KST."""
    # 2026-01-01 09:00:00 KST
    kst_input = datetime(2026, 1, 1, 9, 0, 0, tzinfo=KST)
    kst_output = to_kst_datetime(kst_input)
    
    assert kst_output == kst_input
    assert kst_output.hour == 9

def test_kst_base_model_serialization():
    """KstBaseModel should serialize datetimes as ISO string with KST offset."""
    class TestModel(KstBaseModel):
        dt: datetime
        opt_dt: datetime | None = None

    # Case 1: UTC Input
    dt_utc = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    model = TestModel(dt=dt_utc)
    
    json_str = model.model_dump_json()
    data = json.loads(json_str)
    
    # Expect 09:00:00+09:00
    assert "2026-01-01T09:00:00+09:00" in data["dt"]

    # Case 2: Naive Input
    dt_naive = datetime(2026, 1, 1, 0, 0, 0)
    model2 = TestModel(dt=dt_naive)
    json_str2 = model2.model_dump_json()
    data2 = json.loads(json_str2)
    assert "2026-01-01T09:00:00+09:00" in data2["dt"]
