"""Streak/Mission 시간 경계 테스트 (00:00~09:00 KST).

See: docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/10.mission_actionable_guides.md (E항목)

테스트 시나리오:
1. 00:00 KST 직후 → 전날 운영일로 처리
2. 08:59 KST → 전날 운영일로 처리
3. 09:00 KST → 오늘 운영일로 전환
4. 23:59 KST → 오늘 운영일로 유지
5. 자정 넘기 전후 스트릭/클레임 상태 변화

CI 실행: pytest -k midnight tests/test_streak_midnight_boundary.py
"""
from __future__ import annotations

from datetime import datetime, date, timedelta
from typing import Generator
from zoneinfo import ZoneInfo
from unittest.mock import patch, MagicMock

import pytest

# =============================================================================
# Fixtures
# =============================================================================

KST = ZoneInfo("Asia/Seoul")


@pytest.fixture
def mock_db_session() -> MagicMock:
    """Mock DB session."""
    return MagicMock()


def make_kst_datetime(year: int, month: int, day: int, hour: int, minute: int = 0) -> datetime:
    """KST datetime 생성 헬퍼."""
    return datetime(year, month, day, hour, minute, tzinfo=KST)


# =============================================================================
# Tests - Operational Play Date (09:00 KST Reset)
# =============================================================================

class TestOperationalPlayDate:
    """운영일 계산 테스트 (09:00 KST 리셋)."""
    
    def test_midnight_returns_previous_day(self):
        """00:00 KST → 전날 운영일."""
        from app.v2.services.streak_service import V2StreakService
        
        # 2026-01-26 00:00 KST
        now_kst = make_kst_datetime(2026, 1, 26, 0, 0)
        result = V2StreakService.get_operational_play_date(now_kst, reset_hour=9)
        
        assert result == date(2026, 1, 25), "00:00 should return previous day"
    
    def test_before_reset_hour_returns_previous_day(self):
        """08:59 KST → 전날 운영일."""
        from app.v2.services.streak_service import V2StreakService
        
        # 2026-01-26 08:59 KST
        now_kst = make_kst_datetime(2026, 1, 26, 8, 59)
        result = V2StreakService.get_operational_play_date(now_kst, reset_hour=9)
        
        assert result == date(2026, 1, 25), "08:59 should return previous day"
    
    def test_at_reset_hour_returns_current_day(self):
        """09:00 KST → 오늘 운영일."""
        from app.v2.services.streak_service import V2StreakService
        
        # 2026-01-26 09:00 KST
        now_kst = make_kst_datetime(2026, 1, 26, 9, 0)
        result = V2StreakService.get_operational_play_date(now_kst, reset_hour=9)
        
        assert result == date(2026, 1, 26), "09:00 should return current day"
    
    def test_after_reset_hour_returns_current_day(self):
        """23:59 KST → 오늘 운영일."""
        from app.v2.services.streak_service import V2StreakService
        
        # 2026-01-26 23:59 KST
        now_kst = make_kst_datetime(2026, 1, 26, 23, 59)
        result = V2StreakService.get_operational_play_date(now_kst, reset_hour=9)
        
        assert result == date(2026, 1, 26), "23:59 should return current day"
    
    def test_edge_case_month_boundary(self):
        """월말 → 월초 전환 시 운영일 계산."""
        from app.v2.services.streak_service import V2StreakService
        
        # 2026-02-01 00:00 KST
        now_kst = make_kst_datetime(2026, 2, 1, 0, 0)
        result = V2StreakService.get_operational_play_date(now_kst, reset_hour=9)
        
        assert result == date(2026, 1, 31), "Feb 1 00:00 should return Jan 31"
    
    def test_edge_case_year_boundary(self):
        """연말 → 연초 전환 시 운영일 계산."""
        from app.v2.services.streak_service import V2StreakService
        
        # 2027-01-01 00:00 KST
        now_kst = make_kst_datetime(2027, 1, 1, 0, 0)
        result = V2StreakService.get_operational_play_date(now_kst, reset_hour=9)
        
        assert result == date(2026, 12, 31), "Jan 1 00:00 should return Dec 31 of previous year"


# =============================================================================
# Tests - Streak Boundary Scenarios
# =============================================================================

class TestStreakMidnightBoundary:
    """스트릭 자정 경계 테스트."""
    
    def test_streak_not_reset_before_9am(self, mock_db_session):
        """09:00 KST 이전에는 스트릭 리셋 안 됨."""
        from app.v2.services.streak_service import V2StreakService
        
        with patch.object(V2StreakService, '_now_tz', return_value=make_kst_datetime(2026, 1, 26, 8, 30)):
            service = V2StreakService(mock_db_session)
            op_date = service._operational_play_date(service._now_tz())
            
            # 08:30 KST → 운영일은 1/25
            assert op_date == date(2026, 1, 25)
    
    def test_streak_resets_at_9am(self, mock_db_session):
        """09:00 KST에 스트릭 리셋."""
        from app.v2.services.streak_service import V2StreakService
        
        with patch.object(V2StreakService, '_now_tz', return_value=make_kst_datetime(2026, 1, 26, 9, 0)):
            service = V2StreakService(mock_db_session)
            op_date = service._operational_play_date(service._now_tz())
            
            # 09:00 KST → 운영일은 1/26
            assert op_date == date(2026, 1, 26)
    
    def test_continuous_streak_across_midnight(self, mock_db_session):
        """자정을 넘어도 09:00까지는 같은 운영일."""
        from app.v2.services.streak_service import V2StreakService
        
        # 1/25 23:50 KST
        time_before_midnight = make_kst_datetime(2026, 1, 25, 23, 50)
        # 1/26 00:10 KST
        time_after_midnight = make_kst_datetime(2026, 1, 26, 0, 10)
        
        op_date_before = V2StreakService.get_operational_play_date(time_before_midnight, 9)
        op_date_after = V2StreakService.get_operational_play_date(time_after_midnight, 9)
        
        # 둘 다 1/25 운영일
        assert op_date_before == date(2026, 1, 25)
        assert op_date_after == date(2026, 1, 25)
        assert op_date_before == op_date_after


# =============================================================================
# Tests - Mission Reset Boundary
# =============================================================================

class TestMissionResetBoundary:
    """미션 리셋 경계 테스트."""
    
    def test_daily_mission_reset_date_before_9am(self, mock_db_session):
        """DAILY 미션 리셋 날짜 - 09:00 이전."""
        from app.v2.services.mission_service import V2MissionService
        
        with patch.object(V2MissionService, '_now_tz', return_value=make_kst_datetime(2026, 1, 26, 8, 0)):
            service = V2MissionService(mock_db_session)
            from app.models.mission import MissionCategory
            
            reset_date = service._get_reset_date_str(MissionCategory.DAILY)
            
            # 08:00 KST → 1/25 운영일
            assert reset_date == "2026-01-25"
    
    def test_daily_mission_reset_date_after_9am(self, mock_db_session):
        """DAILY 미션 리셋 날짜 - 09:00 이후."""
        from app.v2.services.mission_service import V2MissionService
        
        with patch.object(V2MissionService, '_now_tz', return_value=make_kst_datetime(2026, 1, 26, 10, 0)):
            service = V2MissionService(mock_db_session)
            from app.models.mission import MissionCategory
            
            reset_date = service._get_reset_date_str(MissionCategory.DAILY)
            
            # 10:00 KST → 1/26 운영일
            assert reset_date == "2026-01-26"


# =============================================================================
# Tests - Claim Boundary
# =============================================================================

class TestClaimBoundary:
    """클레임 경계 테스트."""
    
    def test_claim_valid_in_grace_period(self):
        """09:00 KST 이전 유예 시간에 클레임 유효."""
        from app.v2.services.streak_service import V2StreakService
        
        # 1/26 08:30 KST → 운영일 1/25
        now_kst = make_kst_datetime(2026, 1, 26, 8, 30)
        op_date = V2StreakService.get_operational_play_date(now_kst, 9)
        
        # 1/25에 달성한 미션을 1/26 08:30에 클레임 가능해야 함
        assert op_date == date(2026, 1, 25)
    
    def test_claim_expired_after_reset(self):
        """09:00 KST 이후 전날 미션 클레임 만료."""
        from app.v2.services.streak_service import V2StreakService
        
        # 1/26 09:30 KST → 운영일 1/26
        now_kst = make_kst_datetime(2026, 1, 26, 9, 30)
        op_date = V2StreakService.get_operational_play_date(now_kst, 9)
        
        # 1/25에 달성한 미션은 더 이상 클레임 불가 (운영일 변경)
        assert op_date == date(2026, 1, 26)


# =============================================================================
# Smoke Tests
# =============================================================================

class TestStreakServiceSmoke:
    """StreakService 스모크 테스트."""
    
    def test_service_instantiation(self, mock_db_session):
        """StreakService 인스턴스 생성."""
        from app.v2.services.streak_service import V2StreakService
        
        service = V2StreakService(mock_db_session)
        assert service is not None
        assert service.db == mock_db_session
    
    def test_get_streak_reward_rules_default(self, mock_db_session):
        """기본 스트릭 보상 규칙 조회."""
        from app.v2.services.streak_service import V2StreakService
        
        # UiConfigService.get이 None 반환하도록 mock
        with patch('app.v2.services.streak_service.UiConfigService.get', return_value=None):
            service = V2StreakService(mock_db_session)
            rules = service._get_streak_reward_rules()
            
            assert len(rules) >= 2
            assert rules[0]["day"] == 3
            assert rules[1]["day"] == 7


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-k", "midnight"])
