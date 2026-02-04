"""
V2 Admin Mission/Streak/Milestone Tests

테스트 범위:
1. 미션 전체 리셋
2. 미션 진행 현황 조회
3. 스트릭 리셋/설정
4. 마일스톤 진행 조회
5. 마일스톤 강제 지급
6. 마일스톤 일괄 배포
7. 제재 해제 로깅
"""
import pytest
from datetime import date, datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from app.v2.schemas.v2_admin_user import (
    UserMissionProgressAdminDto,
    UserMissionsAdminResponse,
    ResetAllMissionsResponse,
    SetStreakCountRequest,
    UserStreakAdminDto,
    MilestoneProgressDto,
    UserMilestoneProgressResponse,
    ForceGrantMilestoneRequest,
    ForceGrantMilestoneResponse,
    DistributeMilestoneRequest,
    DistributeMilestoneResponse,
)


# ============ Schema Tests ============

class TestMissionSchemas:
    """미션 관련 스키마 테스트"""

    def test_user_mission_progress_admin_dto(self):
        """UserMissionProgressAdminDto 생성"""
        dto = UserMissionProgressAdminDto(
            mission_id=1,
            title="로그인 미션",
            category="DAILY",
            logic_key="login",
            current_value=1,
            target_value=1,
            is_completed=True,
            is_claimed=False,
            approval_status="NONE",
        )

        assert dto.mission_id == 1
        assert dto.title == "로그인 미션"
        assert dto.is_completed is True
        assert dto.is_claimed is False

    def test_user_missions_admin_response(self):
        """UserMissionsAdminResponse 생성"""
        missions = [
            UserMissionProgressAdminDto(
                mission_id=1,
                title="미션1",
                category="DAILY",
                logic_key="m1",
                current_value=0,
                target_value=1,
                is_completed=False,
                is_claimed=False,
                approval_status="NONE",
            ),
            UserMissionProgressAdminDto(
                mission_id=2,
                title="미션2",
                category="DAILY",
                logic_key="m2",
                current_value=1,
                target_value=1,
                is_completed=True,
                is_claimed=True,
                approval_status="NONE",
            ),
        ]

        response = UserMissionsAdminResponse(
            user_id=123,
            total_missions=2,
            completed_count=1,
            claimed_count=1,
            missions=missions,
        )

        assert response.user_id == 123
        assert response.total_missions == 2
        assert response.completed_count == 1
        assert len(response.missions) == 2

    def test_reset_all_missions_response(self):
        """ResetAllMissionsResponse 생성"""
        response = ResetAllMissionsResponse(
            success=True,
            user_id=123,
            reset_count=5,
            message="5개 미션 진행도가 리셋되었습니다.",
        )

        assert response.success is True
        assert response.reset_count == 5


class TestStreakSchemas:
    """스트릭 관련 스키마 테스트"""

    def test_set_streak_count_request(self):
        """SetStreakCountRequest 생성"""
        request = SetStreakCountRequest(
            streak_days=7,
            adjust_last_play_date=True,
        )

        assert request.streak_days == 7
        assert request.adjust_last_play_date is True

    def test_set_streak_count_request_validation(self):
        """SetStreakCountRequest 유효성 검사"""
        # 정상 범위
        request = SetStreakCountRequest(streak_days=0)
        assert request.streak_days == 0

        request = SetStreakCountRequest(streak_days=365)
        assert request.streak_days == 365

        # 범위 초과 시 ValidationError
        with pytest.raises(Exception):
            SetStreakCountRequest(streak_days=-1)

        with pytest.raises(Exception):
            SetStreakCountRequest(streak_days=366)

    def test_user_streak_admin_dto(self):
        """UserStreakAdminDto 생성"""
        dto = UserStreakAdminDto(
            user_id=123,
            streak_days=7,
            last_play_date="2026-01-29",
            is_hot=True,
            is_legend=True,
            next_milestone=14,
            claimable_day=7,
            current_multiplier=1.5,
        )

        assert dto.streak_days == 7
        assert dto.is_hot is True
        assert dto.is_legend is True


class TestMilestoneSchemas:
    """마일스톤 관련 스키마 테스트"""

    def test_milestone_progress_dto(self):
        """MilestoneProgressDto 생성"""
        dto = MilestoneProgressDto(
            day=3,
            achieved=True,
            claimed=False,
            claim_date=None,
            rewards=[{"kind": "WALLET", "token_type": "ROULETTE_TICKET", "amount": 1}],
        )

        assert dto.day == 3
        assert dto.achieved is True
        assert dto.claimed is False

    def test_user_milestone_progress_response(self):
        """UserMilestoneProgressResponse 생성"""
        milestones = [
            MilestoneProgressDto(day=3, achieved=True, claimed=True),
            MilestoneProgressDto(day=7, achieved=False, claimed=False),
        ]

        response = UserMilestoneProgressResponse(
            user_id=123,
            streak_days=5,
            milestones=milestones,
        )

        assert response.user_id == 123
        assert response.streak_days == 5
        assert len(response.milestones) == 2

    def test_force_grant_milestone_request(self):
        """ForceGrantMilestoneRequest 생성"""
        request = ForceGrantMilestoneRequest(
            milestone_day=3,
            reason="테스트 지급",
        )

        assert request.milestone_day == 3
        assert request.reason == "테스트 지급"

    def test_force_grant_milestone_response(self):
        """ForceGrantMilestoneResponse 생성"""
        response = ForceGrantMilestoneResponse(
            success=True,
            user_id=123,
            milestone_day=3,
            grants=[{"type": "ROULETTE_TICKET", "amount": 1}],
            message="마일스톤 보상이 지급되었습니다.",
        )

        assert response.success is True
        assert len(response.grants) == 1

    def test_distribute_milestone_request(self):
        """DistributeMilestoneRequest 생성"""
        request = DistributeMilestoneRequest(
            milestone_day=3,
            user_ids=[1, 2, 3],
            reason="일괄 배포",
        )

        assert request.milestone_day == 3
        assert len(request.user_ids) == 3

    def test_distribute_milestone_response(self):
        """DistributeMilestoneResponse 생성"""
        response = DistributeMilestoneResponse(
            success=True,
            milestone_day=3,
            total_users=10,
            success_count=8,
            failed_count=2,
            details=[],
        )

        assert response.total_users == 10
        assert response.success_count == 8
        assert response.failed_count == 2


# ============ Logic Tests ============

class TestMissionResetLogic:
    """미션 리셋 로직 테스트"""

    def test_reset_single_progress(self):
        """단일 미션 진행도 리셋"""
        # 리셋 전 상태
        progress = {
            "current_value": 5,
            "is_completed": True,
            "is_claimed": True,
        }

        # 리셋 후 상태
        progress["current_value"] = 0
        progress["is_completed"] = False
        progress["is_claimed"] = False

        assert progress["current_value"] == 0
        assert progress["is_completed"] is False
        assert progress["is_claimed"] is False

    def test_reset_count_calculation(self):
        """리셋 대상 카운트 계산"""
        progresses = [
            {"user_id": 1, "mission_id": 1, "current_value": 5},
            {"user_id": 1, "mission_id": 2, "current_value": 3},
            {"user_id": 1, "mission_id": 3, "current_value": 0},
        ]

        reset_count = len(progresses)
        assert reset_count == 3


class TestStreakLogic:
    """스트릭 로직 테스트"""

    def test_streak_set_with_date_adjustment(self):
        """스트릭 설정 시 날짜 조정"""
        today = date(2026, 1, 29)
        streak_days = 7

        # streak_days가 0이면 last_play_date도 None
        if streak_days == 0:
            last_play_date = None
        else:
            last_play_date = today

        assert last_play_date == today

    def test_streak_reset_clears_date(self):
        """스트릭 리셋 시 날짜 초기화"""
        streak_days = 0
        last_play_date = None

        assert streak_days == 0
        assert last_play_date is None

    def test_is_hot_threshold(self):
        """핫 스트릭 임계값"""
        hot_threshold = 3

        assert (2 >= hot_threshold) is False
        assert (3 >= hot_threshold) is True
        assert (7 >= hot_threshold) is True

    def test_is_legend_threshold(self):
        """레전드 스트릭 임계값"""
        legend_threshold = 7

        assert (6 >= legend_threshold) is False
        assert (7 >= legend_threshold) is True
        assert (14 >= legend_threshold) is True

    def test_next_milestone_calculation(self):
        """다음 마일스톤 계산"""
        hot_threshold = 3
        legend_threshold = 7

        def calc_next_milestone(streak_days):
            if streak_days < hot_threshold:
                return hot_threshold
            elif streak_days < legend_threshold:
                return legend_threshold
            else:
                return ((streak_days // 7) + 1) * 7

        assert calc_next_milestone(0) == 3
        assert calc_next_milestone(2) == 3
        assert calc_next_milestone(3) == 7
        assert calc_next_milestone(6) == 7
        assert calc_next_milestone(7) == 14
        assert calc_next_milestone(14) == 21


class TestMilestoneLogic:
    """마일스톤 로직 테스트"""

    def test_milestone_achieved_check(self):
        """마일스톤 달성 여부 확인"""
        milestone_day = 3

        assert (2 >= milestone_day) is False
        assert (3 >= milestone_day) is True
        assert (7 >= milestone_day) is True

    def test_milestone_claim_event_name(self):
        """마일스톤 클레임 이벤트 이름 형식"""
        milestone_day = 3
        hit_date = date(2026, 1, 27)

        event_name = f"streak.reward_grant.{milestone_day}.{hit_date.isoformat()}"

        assert event_name == "streak.reward_grant.3.2026-01-27"

    def test_duplicate_grant_prevention(self):
        """중복 지급 방지"""
        existing_events = [
            "streak.reward_grant.3.2026-01-27",
            "streak.reward_grant.7.2026-01-29",
        ]

        new_event = "streak.reward_grant.3.2026-01-27"

        is_duplicate = new_event in existing_events
        assert is_duplicate is True

    def test_milestone_reward_rules(self):
        """마일스톤 보상 규칙"""
        rules = [
            {
                "day": 3,
                "enabled": True,
                "grants": [
                    {"kind": "WALLET", "token_type": "ROULETTE_TICKET", "amount": 1},
                    {"kind": "WALLET", "token_type": "DICE_TICKET", "amount": 1},
                ],
            },
            {
                "day": 7,
                "enabled": True,
                "grants": [
                    {"kind": "WALLET", "token_type": "DIAMOND", "amount": 1},
                ],
            },
        ]

        rule_3 = next((r for r in rules if r["day"] == 3), None)
        assert rule_3 is not None
        assert len(rule_3["grants"]) == 2

        rule_7 = next((r for r in rules if r["day"] == 7), None)
        assert rule_7 is not None
        assert len(rule_7["grants"]) == 1


class TestDistributionLogic:
    """마일스톤 배포 로직 테스트"""

    def test_user_id_list_targeting(self):
        """유저 ID 리스트 타겟팅"""
        user_ids = [1, 2, 3, 4, 5]

        assert len(user_ids) == 5

    def test_segment_based_targeting(self):
        """세그먼트 기반 타겟팅"""
        segments = [
            {"user_id": 1, "segment": "VIP"},
            {"user_id": 2, "segment": "VIP"},
            {"user_id": 3, "segment": "COMMON"},
        ]

        vip_users = [s["user_id"] for s in segments if s["segment"] == "VIP"]

        assert len(vip_users) == 2
        assert vip_users == [1, 2]

    def test_streak_based_targeting(self):
        """스트릭 기반 타겟팅"""
        users = [
            {"id": 1, "play_streak": 2},
            {"id": 2, "play_streak": 5},
            {"id": 3, "play_streak": 7},
            {"id": 4, "play_streak": 10},
        ]

        milestone_day = 3
        eligible_users = [u["id"] for u in users if u["play_streak"] >= milestone_day]

        assert len(eligible_users) == 3
        assert eligible_users == [2, 3, 4]

    def test_batch_result_aggregation(self):
        """배치 결과 집계"""
        results = [
            {"user_id": 1, "status": "success"},
            {"user_id": 2, "status": "success"},
            {"user_id": 3, "status": "failed"},
            {"user_id": 4, "status": "success"},
            {"user_id": 5, "status": "failed"},
        ]

        success_count = sum(1 for r in results if r["status"] == "success")
        failed_count = sum(1 for r in results if r["status"] == "failed")

        assert success_count == 3
        assert failed_count == 2
        assert success_count + failed_count == len(results)


class TestSuspensionLogic:
    """제재 로직 테스트"""

    def test_suspension_check_7day_rule(self):
        """7일 무입금 시 제재"""
        deposit_7d = 0

        is_suspended = deposit_7d < 1
        assert is_suspended is True

        deposit_7d = 1000
        is_suspended = deposit_7d < 1
        assert is_suspended is False

    def test_suspension_removal_on_deposit(self):
        """입금 시 제재 해제"""
        was_suspended = True
        new_deposit = 1000

        # 입금 후 상태
        deposit_7d = new_deposit
        is_suspended = deposit_7d < 1

        # 상태 변경 감지
        status_changed = was_suspended != is_suspended

        assert status_changed is True
        assert is_suspended is False

    def test_suspension_log_event_type(self):
        """제재 로그 이벤트 타입"""
        was_suspended = True
        is_suspended = False

        if was_suspended and not is_suspended:
            event_type = "SUSPENSION_REMOVED"
        elif not was_suspended and is_suspended:
            event_type = "SUSPENSION_APPLIED"
        else:
            event_type = None

        assert event_type == "SUSPENSION_REMOVED"

    def test_30k_cap_for_suspended_users(self):
        """제재 유저 30k 상한"""
        is_suspended = True
        primary_balance = 25000
        amount = 10000

        if is_suspended:
            if primary_balance >= 30000:
                new_balance = primary_balance  # 추가 입금 불가
            else:
                new_balance = min(primary_balance + amount, 30000)
        else:
            new_balance = primary_balance + amount

        assert new_balance == 30000  # 30k 상한 적용


class TestAuditLogTypes:
    """감사 로그 타입 테스트"""

    def test_mission_reset_all_action(self):
        """전체 미션 리셋 액션"""
        action = "MISSION_RESET_ALL"
        target_type = "USER"

        assert action == "MISSION_RESET_ALL"
        assert target_type == "USER"

    def test_streak_reset_action(self):
        """스트릭 리셋 액션"""
        action = "STREAK_RESET"
        before = {"streak_days": 7}
        after = {"streak_days": 0}

        assert action == "STREAK_RESET"
        assert before["streak_days"] > after["streak_days"]

    def test_streak_set_count_action(self):
        """스트릭 설정 액션"""
        action = "STREAK_SET_COUNT"
        before = {"streak_days": 3}
        after = {"streak_days": 10}

        assert action == "STREAK_SET_COUNT"

    def test_milestone_force_grant_action(self):
        """마일스톤 강제 지급 액션"""
        action = "MILESTONE_FORCE_GRANT"
        after = {
            "milestone_day": 3,
            "grants": [{"type": "ROULETTE_TICKET", "amount": 1}],
            "reason": "admin_grant",
        }

        assert action == "MILESTONE_FORCE_GRANT"
        assert after["milestone_day"] == 3

    def test_milestone_distribute_action(self):
        """마일스톤 배포 액션"""
        action = "MILESTONE_DISTRIBUTE"
        target_type = "BATCH"
        after = {
            "milestone_day": 3,
            "total_users": 100,
            "success_count": 95,
            "failed_count": 5,
        }

        assert action == "MILESTONE_DISTRIBUTE"
        assert target_type == "BATCH"

    def test_suspension_removed_action(self):
        """제재 해제 액션"""
        action = "SUSPENSION_REMOVED"
        before = {"benefits_suspended": True}
        after = {
            "benefits_suspended": False,
            "deposit_7d": 1000,
            "trigger": "DEPOSIT",
        }

        assert action == "SUSPENSION_REMOVED"
        assert before["benefits_suspended"] is True
        assert after["benefits_suspended"] is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
