"""추가 미션 SoT 커버리지 테스트.

목표(SoT 기준):
- 운영일(Asia/Seoul, 09:00 리셋) 기준 DAILY reset_date 산정
- WEEKLY reset 키 포맷(YYYY-WXX)
- MissionListResponse의 streak 응답 키(alias) 직렬화

주의:
- 이미 `tests/v2/test_timezone_utils.py`에서 timezone 유틸은 충분히 검증하고 있으므로,
  본 파일은 미션 서비스/스키마의 SoT 준수 여부를 단위 테스트로 보강한다.
"""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import pytest

from app.v2.models import MissionCategory
from app.v2.schemas.v2_mission import MissionListResponse, StreakInfoSchema
from app.v2.services.mission_service import V2MissionService


KST = ZoneInfo("Asia/Seoul")


@pytest.fixture()
def service(monkeypatch: pytest.MonkeyPatch) -> V2MissionService:
    """DB를 사용하지 않는 미션 서비스 인스턴스.

    _get_reset_date_str / _operational_play_date는 DB 접근이 없으므로,
    settings만 고정하면 단위 테스트가 가능하다.
    """

    import app.v2.services.mission_service as ms

    monkeypatch.setattr(
        ms,
        "get_settings",
        lambda: SimpleNamespace(
            timezone="Asia/Seoul",
            streak_day_reset_hour_kst=9,
            # 아래 값들은 일부 메서드에서 참조될 수 있어 기본값을 제공
            streak_multiplier_enabled=False,
            streak_hot_threshold_days=3,
            streak_legend_threshold_days=7,
            streak_hot_multiplier=1.2,
            streak_legend_multiplier=1.5,
        ),
    )

    return V2MissionService(db=None)  # type: ignore[arg-type]


def test_operational_play_date_before_reset_is_previous_day(service: V2MissionService) -> None:
    now_tz = datetime(2026, 2, 7, 8, 59, 0, tzinfo=KST)
    assert service._operational_play_date(now_tz).isoformat() == "2026-02-06"


def test_operational_play_date_at_reset_is_today(service: V2MissionService) -> None:
    now_tz = datetime(2026, 2, 7, 9, 0, 0, tzinfo=KST)
    assert service._operational_play_date(now_tz).isoformat() == "2026-02-07"


def test_get_reset_date_str_daily_uses_operational_date(service: V2MissionService, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(service, "_now_tz", lambda: datetime(2026, 2, 7, 8, 0, 0, tzinfo=KST))
    assert service._get_reset_date_str(MissionCategory.DAILY) == "2026-02-06"

    monkeypatch.setattr(service, "_now_tz", lambda: datetime(2026, 2, 7, 12, 0, 0, tzinfo=KST))
    assert service._get_reset_date_str(MissionCategory.DAILY) == "2026-02-07"


def test_get_reset_date_str_weekly_format(service: V2MissionService, monkeypatch: pytest.MonkeyPatch) -> None:
    fixed = datetime(2026, 2, 7, 12, 0, 0, tzinfo=KST)
    monkeypatch.setattr(service, "_now_tz", lambda: fixed)

    reset_key = service._get_reset_date_str(MissionCategory.WEEKLY)
    assert reset_key == fixed.strftime("%Y-W%V")
    assert reset_key.startswith("2026-W")
    assert len(reset_key) == len("2026-W00")


def test_mission_list_response_serializes_streak_alias_key() -> None:
    streak = StreakInfoSchema(
        current_streak=3,
        current_multiplier=1.0,
        is_hot=False,
        is_legend=False,
        next_milestone=7,
        claimable_day=3,
        claimable_rewards=[3],
    )
    resp = MissionListResponse(missions=[], streak_info=streak)

    dumped = resp.model_dump(by_alias=True)

    assert "streak" in dumped
    assert "streak_info" not in dumped
    assert dumped["streak"]["claimable_day"] == 3


def test_streak_info_claimable_rewards_default_factory_not_shared() -> None:
    a = StreakInfoSchema(
        current_streak=0,
        current_multiplier=1.0,
        is_hot=False,
        is_legend=False,
        next_milestone=3,
    )
    b = StreakInfoSchema(
        current_streak=0,
        current_multiplier=1.0,
        is_hot=False,
        is_legend=False,
        next_milestone=3,
    )

    a.claimable_rewards.append(3)
    assert b.claimable_rewards == []
