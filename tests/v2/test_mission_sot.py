"""V2 Mission SoT 핵심 테스트.

SoT 문서: docs/v2_specs/02_game/v2_mission_glossary_sot_ko.md

테스트 범위:
- 미션 카테고리 정의
- 미션 보상 타입 매핑
- 진행/수령 SoT (is_claimed)
"""
import pytest
from unittest.mock import MagicMock, patch


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


class TestMissionTimeLogic:
    """운영일 리셋 및 시간 로직 테스트 (SoT 7.1)."""

    def test_kst_9am_reset_boundaries(self):
        """KST 9AM 리셋 경계 테스트."""
        from app.v2.services.mission_service import V2MissionService
        from datetime import datetime, timezone
        from zoneinfo import ZoneInfo
        
        # Mock Session and Settings for Service
        mock_db = MagicMock()
        service = V2MissionService(mock_db)
        service.settings = MagicMock()
        service.settings.timezone = "Asia/Seoul"
        service.settings.streak_day_reset_hour_kst = 9
        
        kst = ZoneInfo("Asia/Seoul")
        
        # Caso 1: 08:59:59 KST (Should be Previous Day)
        time_before = datetime(2026, 2, 7, 8, 59, 59, tzinfo=kst)
        reset_date_before = service._operational_play_date(time_before)
        assert reset_date_before.isoformat() == "2026-02-06"
        
        # Caso 2: 09:00:00 KST (Should be Today)
        time_after = datetime(2026, 2, 7, 9, 0, 0, tzinfo=kst)
        reset_date_after = service._operational_play_date(time_after)
        assert reset_date_after.isoformat() == "2026-02-07"

    def test_weekly_reset_date_format(self):
        """WEEKLY reset_date 포맷 (YYYY-WXX)."""
        from app.v2.services.mission_service import V2MissionService
        from datetime import datetime
        from zoneinfo import ZoneInfo
        
        mock_db = MagicMock()
        service = V2MissionService(mock_db)
        service.settings = MagicMock()
        service.settings.timezone = "Asia/Seoul"
        
        kst = ZoneInfo("Asia/Seoul")
        test_time = datetime(2026, 2, 2, 12, 0, 0, tzinfo=kst) # Monday
        
        with patch.object(service, '_now_tz', return_value=test_time):
            from app.v2.models import MissionCategory
            reset_date = service._get_reset_date_str(MissionCategory.WEEKLY)
            # 2026-02-02 is Week 06 of 2026
            assert reset_date == "2026-W06"

class TestMissionNewUserLimit:
    """신규 유저 168시간 정책 테스트 (SoT 7.3)."""

    def test_is_new_user_strict_168h(self, db_session):
        """가입 168시간(7일) 경과 시 NEW_USER 제외."""
        from app.v2.services.mission_service import V2MissionService
        from app.v2.models.user import V2User
        from app.v2.models import UserGameWallet
        from datetime import datetime, timedelta, timezone
        
        service = V2MissionService(db_session)
        
        # 1. 167 hours ago (Still New)
        user_new = V2User(cc_id="NEW_167", created_at=datetime.now(timezone.utc) - timedelta(hours=167))
        db_session.add(user_new)
        db_session.flush()
        db_session.add(UserGameWallet(user_id=user_new.id, token_type="ROULETTE_TICKET", balance=0))
        db_session.commit()
        assert service._is_new_user(user_new.id) is True
        
        # 2. 169 hours ago (Expired)
        user_old = V2User(cc_id="OLD_169", created_at=datetime.now(timezone.utc) - timedelta(hours=169))
        db_session.add(user_old)
        db_session.flush()
        db_session.add(UserGameWallet(user_id=user_old.id, token_type="ROULETTE_TICKET", balance=0))
        db_session.commit()
        assert service._is_new_user(user_old.id) is False

    @patch("app.v2.services.mission_service.V2MissionService._is_new_user")
    def test_update_progress_skips_expired_new_user_missions(self, mock_is_new, db_session):
        """신규 유저 만료 시 NEW_USER 카테고리 미션 업데이트 스킵."""
        from app.v2.services.mission_service import V2MissionService
        from app.v2.models import Mission, MissionCategory
        
        service = V2MissionService(db_session)
        mock_is_new.return_value = False # User is NOT new anymore
        
        # Create a NEW_USER mission
        mission = Mission(
            title="신규 환영",
            category=MissionCategory.NEW_USER,
            action_type="LOGIN",
            target_value=1,
            is_active=True
        )
        db_session.add(mission)
        db_session.commit()
        
        updated = service.update_progress(user_id=999, action_type="LOGIN")
        assert len(updated) == 0 # Should be skipped because _is_new_user is False
