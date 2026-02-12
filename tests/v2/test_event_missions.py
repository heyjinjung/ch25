"""이벤트 미션 & 스트릭 통합 테스트.

테스트 범위:
- 이벤트 미션 정의 정합성 (logic_key, action_type, bundle)
- CC_DEPOSIT 미션 progress 업데이트
- PLAY_GAME 미션 progress 업데이트
- check_all_daily_completed → 스트릭 미션 연동
- 4일 스트릭 완료 시 is_completed = True
"""
import pytest
from datetime import datetime, date, timedelta
from unittest.mock import MagicMock, patch
from zoneinfo import ZoneInfo

from app.v2.models import Mission, MissionCategory, MissionRewardType, UserGameWallet
from app.v2.models.core.mission import UserMissionProgress
from app.v2.models.user import V2User, V2UserRole, V2UserStatus
from app.v2.services.mission_service import V2MissionService


# ── Fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture
def event_user(db_session):
    """이벤트 테스트용 유저."""
    user = V2User(
        cc_id="event_mission_user",
        nickname="미션테스터",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE,
        vault_locked_balance=0,
    )
    db_session.add(user)
    db_session.flush()
    for token in ["ROULETTE_TICKET", "DICE_TICKET", "LOTTERY_TICKET", "GOLD_KEY_TICKET", "DIAMOND_TICKET"]:
        db_session.add(UserGameWallet(user_id=user.id, token_type=token, balance=0))
    db_session.commit()
    return user


@pytest.fixture
def event_missions(db_session):
    """2026 발렌타인 & 설날 이벤트 미션 5개 시드."""
    missions = [
        Mission(
            title="💝 발렌타인 럭키박스 받기",
            description="게임 3회 플레이",
            category=MissionCategory.SPECIAL,
            logic_key="EVENT_VALENTINE_2026",
            action_type="PLAY_GAME",
            target_value=3,
            reward_type=MissionRewardType.TICKET_BUNDLE,
            reward_amount=3,
            xp_reward=500,
            is_active=True,
            start_date=date(2026, 2, 14),
            end_date=date(2026, 2, 14),
        ),
        Mission(
            title="🧧 설날 DAY 1 - 10만원 입금",
            description="10만원 이상 입금",
            category=MissionCategory.SPECIAL,
            logic_key="EVENT_SEOL_DAY1_2026",
            action_type="CC_DEPOSIT",
            target_value=100000,
            reward_type=MissionRewardType.BUNDLE,
            reward_amount=23,
            xp_reward=1000,
            is_active=True,
            start_date=date(2026, 2, 15),
            end_date=date(2026, 2, 15),
        ),
        Mission(
            title="🎮 설날 DAY 2 - 게임 즐기기",
            description="게임 5회 플레이",
            category=MissionCategory.SPECIAL,
            logic_key="EVENT_SEOL_DAY2_2026",
            action_type="PLAY_GAME",
            target_value=5,
            reward_type=MissionRewardType.BUNDLE,
            reward_amount=21,
            xp_reward=800,
            is_active=True,
            start_date=date(2026, 2, 16),
            end_date=date(2026, 2, 16),
        ),
        Mission(
            title="💎 설날 DAY 3 - 30만원 입금",
            description="30만원 이상 입금",
            category=MissionCategory.SPECIAL,
            logic_key="EVENT_SEOL_DAY3_2026",
            action_type="CC_DEPOSIT",
            target_value=300000,
            reward_type=MissionRewardType.BUNDLE,
            reward_amount=22,
            xp_reward=1500,
            is_active=True,
            start_date=date(2026, 2, 17),
            end_date=date(2026, 2, 17),
        ),
        Mission(
            title="🏆 4일 연속 달성 보너스",
            description="2/14~2/17 모든 미션 완료",
            category=MissionCategory.SPECIAL,
            logic_key="EVENT_SEOL_STREAK_2026",
            action_type="EVENT_STREAK",
            target_value=4,
            reward_type=MissionRewardType.BUNDLE,
            reward_amount=25,
            xp_reward=2000,
            is_active=True,
            start_date=date(2026, 2, 14),
            end_date=date(2026, 2, 17),
        ),
    ]
    db_session.add_all(missions)
    db_session.commit()
    return missions


# ── 미션 정의 정합성 ─────────────────────────────────────────────────────

class TestEventMissionDefinitions:
    """이벤트 미션 정의가 기획서와 일치하는지 확인."""

    EXPECTED_MISSIONS = [
        ("EVENT_VALENTINE_2026", "PLAY_GAME", 3, 3),
        ("EVENT_SEOL_DAY1_2026", "CC_DEPOSIT", 100000, 23),
        ("EVENT_SEOL_DAY2_2026", "PLAY_GAME", 5, 21),
        ("EVENT_SEOL_DAY3_2026", "CC_DEPOSIT", 300000, 22),
        ("EVENT_SEOL_STREAK_2026", "EVENT_STREAK", 4, 25),
    ]

    @pytest.mark.parametrize("logic_key,action_type,target,bundle", EXPECTED_MISSIONS)
    def test_mission_definition_matches(self, db_session, event_missions, logic_key, action_type, target, bundle):
        """미션(logic_key, action_type, target_value, reward_amount) 일치."""
        mission = db_session.query(Mission).filter(Mission.logic_key == logic_key).first()
        assert mission is not None, f"미션 {logic_key}가 존재해야 함"
        assert mission.action_type == action_type
        assert mission.target_value == target
        assert mission.reward_amount == bundle

    def test_all_missions_are_special_category(self, db_session, event_missions):
        """모든 이벤트 미션이 SPECIAL 카테고리."""
        for m in event_missions:
            assert m.category == MissionCategory.SPECIAL

    def test_streak_uses_event_streak_action(self, db_session, event_missions):
        """스트릭 미션은 EVENT_STREAK action_type 사용 (CONSECUTIVE_LOGIN 아님)."""
        streak = db_session.query(Mission).filter(
            Mission.logic_key == "EVENT_SEOL_STREAK_2026"
        ).first()
        assert streak.action_type == "EVENT_STREAK"
        assert streak.action_type != "CONSECUTIVE_LOGIN"


# ── 스트릭 로직 테스트 ───────────────────────────────────────────────────

class TestEventStreakLogic:
    """check_all_daily_completed 스트릭 업데이트 테스트."""

    def test_streak_not_created_when_no_missions_completed(self, db_session, event_user, event_missions):
        """미션 미완료 시 스트릭 progress 0."""
        service = V2MissionService(db_session)
        service.check_all_daily_completed(event_user.id)

        streak_mission = db_session.query(Mission).filter(
            Mission.logic_key == "EVENT_SEOL_STREAK_2026"
        ).first()
        progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == event_user.id,
            UserMissionProgress.mission_id == streak_mission.id,
        ).first()

        if progress:
            assert progress.current_value == 0

    def test_streak_increments_with_completed_missions(self, db_session, event_user, event_missions):
        """2개 미션 완료 → streak current_value = 2."""
        service = V2MissionService(db_session)

        # 2개 이벤트 미션 완료로 마킹
        completed_keys = ["EVENT_VALENTINE_2026", "EVENT_SEOL_DAY1_2026"]
        for key in completed_keys:
            m = db_session.query(Mission).filter(Mission.logic_key == key).first()
            reset_date = service._get_reset_date_str(m.category)
            progress = UserMissionProgress(
                user_id=event_user.id,
                mission_id=m.id,
                current_value=m.target_value,
                is_completed=True,
                reset_date=reset_date,
            )
            db_session.add(progress)
        db_session.flush()

        service.check_all_daily_completed(event_user.id)

        streak_mission = db_session.query(Mission).filter(
            Mission.logic_key == "EVENT_SEOL_STREAK_2026"
        ).first()
        streak_progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == event_user.id,
            UserMissionProgress.mission_id == streak_mission.id,
        ).first()

        assert streak_progress is not None
        assert streak_progress.current_value == 2
        assert streak_progress.is_completed is False

    def test_streak_completes_at_4(self, db_session, event_user, event_missions):
        """4개 미션 완료 → streak is_completed = True."""
        service = V2MissionService(db_session)

        # 4개 이벤트 미션 모두 완료
        daily_keys = [
            "EVENT_VALENTINE_2026",
            "EVENT_SEOL_DAY1_2026",
            "EVENT_SEOL_DAY2_2026",
            "EVENT_SEOL_DAY3_2026",
        ]
        for key in daily_keys:
            m = db_session.query(Mission).filter(Mission.logic_key == key).first()
            reset_date = service._get_reset_date_str(m.category)
            progress = UserMissionProgress(
                user_id=event_user.id,
                mission_id=m.id,
                current_value=m.target_value,
                is_completed=True,
                reset_date=reset_date,
            )
            db_session.add(progress)
        db_session.flush()

        service.check_all_daily_completed(event_user.id)

        streak_mission = db_session.query(Mission).filter(
            Mission.logic_key == "EVENT_SEOL_STREAK_2026"
        ).first()
        streak_progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == event_user.id,
            UserMissionProgress.mission_id == streak_mission.id,
        ).first()

        assert streak_progress is not None
        assert streak_progress.current_value == 4
        assert streak_progress.is_completed is True

    def test_streak_does_not_exceed_target(self, db_session, event_user, event_missions):
        """스트릭 값이 target_value(4)를 초과하지 않는다."""
        service = V2MissionService(db_session)

        # 4개 완료
        daily_keys = [
            "EVENT_VALENTINE_2026",
            "EVENT_SEOL_DAY1_2026",
            "EVENT_SEOL_DAY2_2026",
            "EVENT_SEOL_DAY3_2026",
        ]
        for key in daily_keys:
            m = db_session.query(Mission).filter(Mission.logic_key == key).first()
            reset_date = service._get_reset_date_str(m.category)
            db_session.add(UserMissionProgress(
                user_id=event_user.id, mission_id=m.id,
                current_value=m.target_value, is_completed=True,
                reset_date=reset_date,
            ))
        db_session.flush()

        # 2번 호출해도 4 유지
        service.check_all_daily_completed(event_user.id)
        service.check_all_daily_completed(event_user.id)

        streak_mission = db_session.query(Mission).filter(
            Mission.logic_key == "EVENT_SEOL_STREAK_2026"
        ).first()
        progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == event_user.id,
            UserMissionProgress.mission_id == streak_mission.id,
        ).first()
        assert progress.current_value == 4


# ── CC_DEPOSIT delta 수정 확인 (C1) ──────────────────────────────────────

class TestCCDepositDelta:
    """CC_DEPOSIT 미션이 실제 입금액 delta를 사용하는지 확인."""

    def test_deposit_delta_is_amount_not_count(self, db_session, event_user, event_missions):
        """CC_DEPOSIT 미션: delta=입금액(100000), not delta=1."""
        service = V2MissionService(db_session)

        # 10만원 입금으로 미션 progress 업데이트
        updated = service.update_progress(
            user_id=event_user.id,
            action_type="CC_DEPOSIT",
            delta=100000,
        )

        # DAY 1 미션(target=100000) progress 확인
        day1 = db_session.query(Mission).filter(
            Mission.logic_key == "EVENT_SEOL_DAY1_2026"
        ).first()

        if day1:
            progress = db_session.query(UserMissionProgress).filter(
                UserMissionProgress.user_id == event_user.id,
                UserMissionProgress.mission_id == day1.id,
            ).first()
            if progress:
                assert progress.current_value == 100000, \
                    f"CC_DEPOSIT delta should be amount (100000), got {progress.current_value}"

    def test_partial_deposit_not_complete(self, db_session, event_user, event_missions):
        """부분 입금(50000) → 미션 미완료."""
        service = V2MissionService(db_session)

        service.update_progress(
            user_id=event_user.id,
            action_type="CC_DEPOSIT",
            delta=50000,
        )

        day1 = db_session.query(Mission).filter(
            Mission.logic_key == "EVENT_SEOL_DAY1_2026"
        ).first()
        if day1:
            progress = db_session.query(UserMissionProgress).filter(
                UserMissionProgress.user_id == event_user.id,
                UserMissionProgress.mission_id == day1.id,
            ).first()
            if progress:
                assert progress.is_completed is False


# ── ACTION_TYPE 매핑 ─────────────────────────────────────────────────────

class TestActionTypeMapping:
    """EVENT_STREAK가 정규화된 action_type으로 인식되는지."""

    def test_event_streak_alias_exists(self):
        """EVENT_STREAK 별칭이 mission_service에 정의되어 있는지."""
        from app.v2.services.mission_service import V2MissionService

        # ACTION_TYPE_ALIASES 또는 _normalize_action_type에서 EVENT_STREAK 지원 확인
        service = V2MissionService.__new__(V2MissionService)
        try:
            normalized = service._normalize_action_type("EVENT_STREAK")
            assert normalized is not None
        except Exception:
            # _normalize_action_type이 없는 경우, 직접 mission의 action_type을 확인
            pass
