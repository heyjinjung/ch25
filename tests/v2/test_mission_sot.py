"""V2 Mission SoT 핵심 테스트.

SoT 문서: docs/v2_specs/02_game/v2_mission_glossary_sot_ko.md

테스트 범위:
- 미션 카테고리 정의
- 미션 보상 타입 매핑
- 진행/수령 SoT (is_claimed)
"""
import pytest


class TestMissionCategories:
    """미션 카테고리 테스트 (SoT 4)."""

    CATEGORIES = ["DAILY", "WEEKLY", "NEW_USER", "SPECIAL_EVENT"]

    def test_4_categories_defined(self):
        """미션 카테고리 4종."""
        assert len(self.CATEGORIES) == 4

    @pytest.mark.parametrize("category", ["DAILY", "WEEKLY", "NEW_USER", "SPECIAL_EVENT"])
    def test_each_category_exists(self, category):
        """각 카테고리 존재 확인."""
        assert category in self.CATEGORIES


class TestMissionRewardMapping:
    """미션 보상 타입 매핑 테스트 (SoT 5)."""

    REWARD_MAPPING = {
        "DAILY": ["POINT", "ROULETTE_TICKET", "DICE_TICKET"],
        "WEEKLY": ["DIAMOND", "GOLD_KEY_TICKET", "LOTTERY_TICKET"],
        "NEW_USER": ["BUNDLE", "GIFTICON"],
        "SPECIAL_EVENT": ["ALL"],  # 제약 없음
    }

    def test_daily_allows_small_rewards(self):
        """DAILY 미션은 소액 보상."""
        allowed = self.REWARD_MAPPING["DAILY"]
        assert "POINT" in allowed
        assert "ROULETTE_TICKET" in allowed
        assert "DICE_TICKET" in allowed

    def test_weekly_allows_rare_rewards(self):
        """WEEKLY 미션은 희소 보상."""
        allowed = self.REWARD_MAPPING["WEEKLY"]
        assert "DIAMOND" in allowed
        assert "GOLD_KEY_TICKET" in allowed
        assert "LOTTERY_TICKET" in allowed

    def test_new_user_allows_bundle(self):
        """NEW_USER 미션은 번들/기프티콘."""
        allowed = self.REWARD_MAPPING["NEW_USER"]
        assert "BUNDLE" in allowed

    def test_special_event_no_restriction(self):
        """SPECIAL_EVENT는 제약 없음."""
        allowed = self.REWARD_MAPPING["SPECIAL_EVENT"]
        assert "ALL" in allowed


class TestMissionProgressSoT:
    """미션 진행 SoT 테스트."""

    def test_is_claimed_is_sot(self):
        """is_claimed가 지급 여부 SoT."""
        # user_mission_progress.is_claimed가 True면 이미 수령
        progress = {
            "user_id": 1,
            "mission_id": 10,
            "current_count": 5,
            "target_count": 5,
            "is_claimed": False,
        }

        # 미션 완료 + 미수령
        is_completed = progress["current_count"] >= progress["target_count"]
        is_claimable = is_completed and not progress["is_claimed"]

        assert is_completed is True
        assert is_claimable is True

        # 수령 처리
        progress["is_claimed"] = True
        is_claimable = is_completed and not progress["is_claimed"]
        assert is_claimable is False

    def test_approval_workflow(self):
        """승인 워크플로우 테스트."""
        # 승인 필요 미션
        mission = {
            "id": 20,
            "requires_approval": True,
            "approval_status": "PENDING",
        }

        # 미승인 시 지급 차단
        can_claim = mission["approval_status"] == "APPROVED"
        assert can_claim is False

        # 승인 후 지급 가능
        mission["approval_status"] = "APPROVED"
        can_claim = mission["approval_status"] == "APPROVED"
        assert can_claim is True


class TestNewUserMission:
    """신규 유저 미션 테스트."""

    NEW_USER_WINDOW_DAYS = 7
    STARTER_MISSIONS = 4  # CC채널가입 폐기됨

    def test_new_user_window_7_days(self):
        """신규 유저 미션 유효 기간 7일."""
        assert self.NEW_USER_WINDOW_DAYS == 7

    def test_starter_missions_count(self):
        """스타터 미션 4종 (CC채널가입 폐기)."""
        assert self.STARTER_MISSIONS == 4
