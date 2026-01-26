"""Timezone utilities for XMAS Event System.

비즈니스 일자 기준: 매일 09:00 KST (당일 09:00 ~ 익일 08:59:59)
모든 일간 리셋/집계는 이 기준을 따름.
"""

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from functools import lru_cache

from app.core.config import get_settings

KST = ZoneInfo("Asia/Seoul")
UTC = ZoneInfo("UTC")


@lru_cache(maxsize=1)
def _get_reset_hour() -> int:
    """Get configured business day reset hour (default: 9 KST)."""
    return get_settings().streak_day_reset_hour_kst


def kst_now() -> datetime:
    """Return current datetime in KST timezone."""
    return datetime.now(KST)


def business_day_start(reference: datetime | None = None) -> datetime:
    """Return the start of the current business day (09:00 KST) in UTC.
    
    비즈니스 일자 기준:
    - 09:00 KST ~ 익일 08:59:59 KST가 하나의 비즈니스 일자
    - reference가 09:00 KST 이전이면 전일 09:00 KST가 시작점
    
    Args:
        reference: 기준 시각 (기본: 현재 KST)
    
    Returns:
        비즈니스 일자 시작 시각 (UTC)
    """
    reset_hour = _get_reset_hour()
    
    if reference is None:
        reference = kst_now()
    elif reference.tzinfo is None:
        reference = reference.replace(tzinfo=KST)
    else:
        reference = reference.astimezone(KST)
    
    # 현재 시각이 리셋 시간 이전이면 전날 리셋 시간이 비즈니스 일자 시작
    if reference.hour < reset_hour:
        base_date = reference.date() - timedelta(days=1)
    else:
        base_date = reference.date()
    
    start_kst = datetime.combine(base_date, time(hour=reset_hour), tzinfo=KST)
    return start_kst.astimezone(UTC)


def business_day_end(reference: datetime | None = None) -> datetime:
    """Return the end of the current business day (08:59:59.999999 KST next day) in UTC.
    
    Args:
        reference: 기준 시각 (기본: 현재 KST)
    
    Returns:
        비즈니스 일자 종료 시각 (UTC)
    """
    start = business_day_start(reference)
    # 비즈니스 일자는 24시간
    return start + timedelta(days=1) - timedelta(microseconds=1)


def yesterday_business_day_range(reference: datetime | None = None) -> tuple[datetime, datetime]:
    """Return UTC start/end for yesterday's business day.
    
    Args:
        reference: 기준 시각 (기본: 현재 KST)
    
    Returns:
        (start_utc, end_utc) tuple
    """
    reset_hour = _get_reset_hour()
    
    if reference is None:
        reference = kst_now()
    elif reference.tzinfo is None:
        reference = reference.replace(tzinfo=KST)
    else:
        reference = reference.astimezone(KST)
    
    # 현재 비즈니스 일자의 시작점 계산
    if reference.hour < reset_hour:
        today_business_date = reference.date() - timedelta(days=1)
    else:
        today_business_date = reference.date()
    
    # 전일 비즈니스 일자
    yesterday_business_date = today_business_date - timedelta(days=1)
    
    start_kst = datetime.combine(yesterday_business_date, time(hour=reset_hour), tzinfo=KST)
    end_kst = start_kst + timedelta(days=1) - timedelta(microseconds=1)
    
    return start_kst.astimezone(UTC), end_kst.astimezone(UTC)


def today_business_day_start_utc(reference: datetime | None = None) -> datetime:
    """Alias for business_day_start - returns current business day start in UTC.
    
    이 함수는 AdminDashboardService 등에서 기존 _get_today_kst_start_in_utc 대체용.
    """
    return business_day_start(reference)
