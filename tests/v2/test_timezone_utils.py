"""KST 09:00 운영일(비즈니스데이) 유틸 테스트.

대상: app.v2.utils.timezone
- business_day_start/end
- yesterday_business_day_range
- utc_to_kst / utc_to_kst_iso

주의:
- 설정값(streak_day_reset_hour_kst)은 테스트에서 고정(9)한다.
- naive datetime 처리 정책도 함께 검증한다.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import pytest

import app.v2.utils.timezone as tzutil


@pytest.fixture(autouse=True)
def _force_reset_hour_9(monkeypatch: pytest.MonkeyPatch):
    tzutil._get_reset_hour.cache_clear()
    monkeypatch.setattr(
        tzutil,
        "get_settings",
        lambda: SimpleNamespace(streak_day_reset_hour_kst=9),
    )
    tzutil._get_reset_hour.cache_clear()
    yield
    tzutil._get_reset_hour.cache_clear()


def test_business_day_start_before_reset_uses_previous_day() -> None:
    kst = ZoneInfo("Asia/Seoul")
    ref = datetime(2026, 2, 4, 8, 59, 0, tzinfo=kst)

    start_utc = tzutil.business_day_start(ref)

    assert start_utc.tzinfo == ZoneInfo("UTC")
    assert start_utc == datetime(2026, 2, 3, 0, 0, 0, tzinfo=ZoneInfo("UTC"))


def test_business_day_start_at_reset_uses_today() -> None:
    kst = ZoneInfo("Asia/Seoul")
    ref = datetime(2026, 2, 4, 9, 0, 0, tzinfo=kst)

    start_utc = tzutil.business_day_start(ref)

    assert start_utc == datetime(2026, 2, 4, 0, 0, 0, tzinfo=ZoneInfo("UTC"))


def test_business_day_end_is_24h_minus_microsecond() -> None:
    kst = ZoneInfo("Asia/Seoul")
    ref = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst)

    start_utc = tzutil.business_day_start(ref)
    end_utc = tzutil.business_day_end(ref)

    assert end_utc - start_utc == (timedelta(days=1) - timedelta(microseconds=1))


def test_yesterday_business_day_range_matches_expected() -> None:
    kst = ZoneInfo("Asia/Seoul")
    ref = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst)

    start_utc, end_utc = tzutil.yesterday_business_day_range(ref)

    assert start_utc == datetime(2026, 2, 3, 0, 0, 0, tzinfo=ZoneInfo("UTC"))
    assert end_utc == datetime(2026, 2, 3, 23, 59, 59, 999999, tzinfo=ZoneInfo("UTC"))


def test_business_day_start_naive_reference_is_treated_as_kst() -> None:
    # naive datetime은 KST로 간주한다 (timezone.py 정책)
    ref_naive = datetime(2026, 2, 4, 8, 59, 0)
    start_utc = tzutil.business_day_start(ref_naive)

    assert start_utc == datetime(2026, 2, 3, 0, 0, 0, tzinfo=ZoneInfo("UTC"))


def test_utc_to_kst_accepts_naive_as_utc() -> None:
    # naive datetime은 UTC로 간주한다 (schemas/base 정책과 동일한 방향)
    dt_naive_utc = datetime(2026, 2, 3, 0, 0, 0)
    kst_dt = tzutil.utc_to_kst(dt_naive_utc)

    assert kst_dt is not None
    assert kst_dt.tzinfo == ZoneInfo("Asia/Seoul")
    assert kst_dt == datetime(2026, 2, 3, 9, 0, 0, tzinfo=ZoneInfo("Asia/Seoul"))


def test_utc_to_kst_iso_formats_offset() -> None:
    dt_aware = datetime(2026, 2, 3, 0, 0, 0, tzinfo=timezone.utc)
    iso = tzutil.utc_to_kst_iso(dt_aware)

    assert iso == "2026-02-03T09:00:00+09:00"
