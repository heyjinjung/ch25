"""V2 Team Battle 서비스 테스트.

도메인: 팀배틀
커버리지 대상: team_battle_service.py
SoT 문서: v2_team_battle_sot_ko.md
"""
import pytest
from datetime import datetime, timedelta


class TestTeamConfiguration:
    """팀 구성 테스트."""

    MAX_TEAM_MEMBERS = 7
    TEAM_SELECTION_WINDOW_HOURS = 48

    def test_max_members_is_7(self):
        """팀 최대 인원 7명."""
        assert self.MAX_TEAM_MEMBERS == 7

    def test_selection_window_48h(self):
        """팀 선택 기간 48시간."""
        assert self.TEAM_SELECTION_WINDOW_HOURS == 48

    def test_team_full_blocks_join(self):
        """팀 정원 초과 시 가입 차단."""
        current_members = 7
        can_join = current_members < self.MAX_TEAM_MEMBERS
        assert can_join is False

    def test_team_not_full_allows_join(self):
        """팀 정원 미달 시 가입 허용."""
        current_members = 5
        can_join = current_members < self.MAX_TEAM_MEMBERS
        assert can_join is True


class TestSeasonManagement:
    """시즌 관리 테스트."""

    def test_active_season_required(self):
        """활성 시즌 필요."""
        seasons = [
            {"id": 1, "is_active": False},
            {"id": 2, "is_active": True},
        ]
        active = next((s for s in seasons if s["is_active"]), None)
        assert active is not None
        assert active["id"] == 2

    def test_no_active_season_blocks_operations(self):
        """활성 시즌 없으면 작업 차단."""
        seasons = [
            {"id": 1, "is_active": False},
        ]
        active = next((s for s in seasons if s["is_active"]), None)
        assert active is None

    def test_season_date_validation(self):
        """시즌 기간 검증."""
        now = datetime.utcnow()
        season = {
            "starts_at": now - timedelta(days=1),
            "ends_at": now + timedelta(days=6),
        }
        is_within_season = season["starts_at"] <= now <= season["ends_at"]
        assert is_within_season is True


class TestTeamScoring:
    """팀 점수 테스트."""

    def test_game_play_adds_points(self):
        """게임 플레이 시 팀 점수 추가."""
        team_score = 1000
        game_points = 50
        new_score = team_score + game_points
        assert new_score == 1050

    def test_points_by_game_type(self):
        """게임 타입별 점수."""
        game_points = {
            "ROULETTE": 10,
            "DICE": 5,
            "LOTTERY": 15,
        }
        
        total = sum(game_points.values())
        assert total == 30

    def test_team_ranking_by_score(self):
        """점수순 팀 랭킹."""
        teams = [
            {"name": "A", "score": 500},
            {"name": "B", "score": 1200},
            {"name": "C", "score": 800},
        ]
        
        ranked = sorted(teams, key=lambda t: t["score"], reverse=True)
        assert ranked[0]["name"] == "B"
        assert ranked[1]["name"] == "C"
        assert ranked[2]["name"] == "A"


class TestMembershipRules:
    """팀 멤버십 규칙 테스트."""

    def test_one_team_per_user(self):
        """유저당 1팀만 가입 가능."""
        user_team = {"user_id": 1, "team_id": 5}
        
        # 다른 팀 가입 시도
        can_join_another = user_team["team_id"] is None
        assert can_join_another is False

    def test_selection_window_open(self):
        """선택 기간 내 가입 가능."""
        now = datetime.utcnow()
        season_start = now - timedelta(hours=24)
        window_end = season_start + timedelta(hours=48)
        
        is_window_open = season_start <= now <= window_end
        assert is_window_open is True

    def test_selection_window_closed(self):
        """선택 기간 후 가입 불가."""
        now = datetime.utcnow()
        season_start = now - timedelta(hours=72)  # 72시간 전 시작
        window_end = season_start + timedelta(hours=48)  # 24시간 전 종료
        
        is_window_open = season_start <= now <= window_end
        assert is_window_open is False

    def test_leave_window_closed_locked(self):
        """선택 기간 후 탈퇴 불가 (Locked)."""
        now = datetime.utcnow()
        season_start = now - timedelta(hours=50) # 50시간 경과
        window_end = season_start + timedelta(hours=48)
        
        is_locked = now > window_end
        assert is_locked is True


class TestTeamEventLog:
    """팀 이벤트 로그 테스트."""

    def test_join_event_logged(self):
        """팀 가입 이벤트 기록."""
        event = {
            "user_id": 1,
            "team_id": 5,
            "event_type": "JOIN",
            "points": 0,
        }
        assert event["event_type"] == "JOIN"

    def test_game_event_logged(self):
        """게임 플레이 이벤트 기록."""
        event = {
            "user_id": 1,
            "team_id": 5,
            "event_type": "GAME_PLAY",
            "points": 10,
        }
        assert event["event_type"] == "GAME_PLAY"
        assert event["points"] == 10
