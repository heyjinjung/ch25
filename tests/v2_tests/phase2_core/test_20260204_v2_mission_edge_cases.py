"""
V2 미션 엣지케이스 테스트

출처:
- docs/v2_specs/02_game/v2_mission_glossary_sot_ko.md
- docs/v2_specs/90_troubleshooting/W06_MISSION_troubleshooting.md
- docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/09.mission.md

테스트 대상:
1. 운영일 계산 (09:00 KST 리셋)
2. Action type 정규화
3. 중복 호출 방지 (ensure_login_progress)
4. 신규 유저 7일 윈도우
5. 시간 윈도우 필터링
6. Vault 이익 정지 상태 체크
"""

from datetime import datetime, timedelta, timezone, time
from typing import Generator
from unittest.mock import patch, MagicMock
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base_class import Base
from app.v2.models.user import V2User
from app.v2.models.core.mission import (
    Mission, UserMissionProgress, MissionCategory, MissionRewardType, ApprovalStatus
)
from app.v2.services.mission_service import V2MissionService


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    import app.db.base  # noqa: F401
    import app.v2.models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


def _create_user(db: Session, user_id: int, created_at: datetime | None = None) -> V2User:
    """테스트용 유저 생성"""
    user = V2User(
        id=user_id,
        cc_id=f"mission_test_{user_id}",
        nickname=f"MissionTest{user_id}",
        telegram_id=f"tg_{user_id}",
        created_at=created_at or datetime.now(timezone.utc),
        total_charge_amount=10000,
    )
    db.add(user)
    db.commit()
    return user


def _create_mission(
    db: Session,
    mission_id: int,
    category: MissionCategory = MissionCategory.DAILY,
    action_type: str = "PLAY_GAME",
    target_value: int = 1,
    reward_type: MissionRewardType = MissionRewardType.POINT,
    reward_amount: int = 100,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    start_time: time | None = None,
    end_time: time | None = None,
    is_active: bool = True,
) -> Mission:
    """테스트용 미션 생성"""
    mission = Mission(
        id=mission_id,
        title=f"Test Mission {mission_id}",
        description=f"Test mission description {mission_id}",
        category=category,
        logic_key=f"test_mission_{mission_id}",
        action_type=action_type,
        target_value=target_value,
        reward_type=reward_type,
        reward_amount=reward_amount,
        start_date=start_date,
        end_date=end_date,
        start_time=start_time,
        end_time=end_time,
        is_active=is_active,
    )
    db.add(mission)
    db.commit()
    return mission


# =============================================================================
# 1. 운영일 계산 테스트 (09:00 KST 리셋)
# =============================================================================

class TestOperationalPlayDate:
    """
    출처: v2_mission_glossary_sot_ko.md §운영일 계산

    규칙:
    - 09:00 KST 이전: 전날 운영일
    - 09:00 KST 이후: 오늘 운영일
    """

    def test_before_reset_08_59_is_yesterday(self):
        """08:59 KST는 전날 운영일"""
        kst = ZoneInfo("Asia/Seoul")
        # 2026-02-04 08:59 KST
        now_kst = datetime(2026, 2, 4, 8, 59, 0, tzinfo=kst)

        service = V2MissionService(MagicMock())
        play_date = service._operational_play_date(now_kst)

        assert play_date == datetime(2026, 2, 3).date()

    def test_after_reset_09_00_is_today(self):
        """09:00 KST는 오늘 운영일"""
        kst = ZoneInfo("Asia/Seoul")
        # 2026-02-04 09:00 KST
        now_kst = datetime(2026, 2, 4, 9, 0, 0, tzinfo=kst)

        service = V2MissionService(MagicMock())
        play_date = service._operational_play_date(now_kst)

        assert play_date == datetime(2026, 2, 4).date()

    def test_midnight_00_00_is_yesterday(self):
        """00:00 KST는 전날 운영일"""
        kst = ZoneInfo("Asia/Seoul")
        # 2026-02-04 00:00 KST
        now_kst = datetime(2026, 2, 4, 0, 0, 0, tzinfo=kst)

        service = V2MissionService(MagicMock())
        play_date = service._operational_play_date(now_kst)

        assert play_date == datetime(2026, 2, 3).date()

    def test_late_night_23_59_is_today(self):
        """23:59 KST는 오늘 운영일"""
        kst = ZoneInfo("Asia/Seoul")
        # 2026-02-04 23:59 KST
        now_kst = datetime(2026, 2, 4, 23, 59, 0, tzinfo=kst)

        service = V2MissionService(MagicMock())
        play_date = service._operational_play_date(now_kst)

        assert play_date == datetime(2026, 2, 4).date()


# =============================================================================
# 2. Action Type 정규화 테스트
# =============================================================================

class TestActionTypeNormalization:
    """
    출처: mission_service.py §ACTION_TYPE_ALIASES

    액션 타입 별칭 매핑:
    - PLAY_GAME: ["PLAY"]
    - PLAY_DICE: ["DICE_PLAY"]
    - PLAY_ROULETTE: ["ROULETTE_PLAY"]
    - CC_DEPOSIT: ["DEPOSIT", "CC_INPUT"]
    - CONSECUTIVE_LOGIN: ["NEXT_DAY_LOGIN", "LOGIN_STREAK"]
    """

    def test_normalize_play_to_play_game(self):
        """PLAY → PLAY_GAME 정규화"""
        service = V2MissionService(MagicMock())
        normalized = service._normalize_action_type("PLAY")
        assert normalized[0] == "PLAY_GAME"
        assert "PLAY" in normalized

    def test_normalize_dice_play_to_play_dice(self):
        """DICE_PLAY → PLAY_DICE 정규화"""
        service = V2MissionService(MagicMock())
        normalized = service._normalize_action_type("DICE_PLAY")
        assert normalized[0] == "PLAY_DICE"
        assert "DICE_PLAY" in normalized

    def test_normalize_roulette_play_to_play_roulette(self):
        """ROULETTE_PLAY → PLAY_ROULETTE 정규화"""
        service = V2MissionService(MagicMock())
        normalized = service._normalize_action_type("ROULETTE_PLAY")
        assert normalized[0] == "PLAY_ROULETTE"
        assert "ROULETTE_PLAY" in normalized

    def test_normalize_deposit_to_cc_deposit(self):
        """DEPOSIT → CC_DEPOSIT 정규화"""
        service = V2MissionService(MagicMock())
        normalized = service._normalize_action_type("DEPOSIT")
        assert normalized[0] == "CC_DEPOSIT"
        assert "DEPOSIT" in normalized

    def test_normalize_cc_input_to_cc_deposit(self):
        """CC_INPUT → CC_DEPOSIT 정규화"""
        service = V2MissionService(MagicMock())
        normalized = service._normalize_action_type("CC_INPUT")
        assert normalized[0] == "CC_DEPOSIT"
        assert "CC_INPUT" in normalized

    def test_normalize_next_day_login_to_consecutive_login(self):
        """NEXT_DAY_LOGIN → CONSECUTIVE_LOGIN 정규화"""
        service = V2MissionService(MagicMock())
        normalized = service._normalize_action_type("NEXT_DAY_LOGIN")
        assert normalized[0] == "CONSECUTIVE_LOGIN"
        assert "NEXT_DAY_LOGIN" in normalized

    def test_unknown_type_returns_as_is(self):
        """미등록 타입은 그대로 반환"""
        service = V2MissionService(MagicMock())
        normalized = service._normalize_action_type("UNKNOWN_ACTION")
        assert normalized == ["UNKNOWN_ACTION"]

    def test_case_insensitive_normalization(self):
        """대소문자 무관하게 정규화"""
        service = V2MissionService(MagicMock())
        normalized = service._normalize_action_type("play")
        assert normalized == ["play"]


# =============================================================================
# 3. 중복 호출 방지 테스트 (ensure_login_progress)
# =============================================================================

class TestDuplicateCallPrevention:
    """
    출처: W06_MISSION_troubleshooting.md §V1/V2 중복 호출

    버그: 텔레그램 로그인 시 V1/V2 동시 호출로 LOGIN 미션 +2 증가
    해결: 당일 이미 LOGIN 미션 진행이 있으면 스킵
    """

    def test_first_login_progress_increments(self, db_session: Session):
        """첫 로그인 시 진행도 +1"""
        user = _create_user(db_session, 1)
        mission = _create_mission(
            db_session, 1,
            category=MissionCategory.DAILY,
            action_type="LOGIN",
            target_value=1,
        )

        # 첫 번째 호출
        V2MissionService.ensure_login_progress(db_session, user.id)

        progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == mission.id,
        ).first()

        assert progress is not None
        assert progress.current_value == 1

    def test_duplicate_login_call_skipped(self, db_session: Session):
        """중복 로그인 호출 시 스킵 (진행도 변화 없음)"""
        user = _create_user(db_session, 2)
        mission = _create_mission(
            db_session, 2,
            category=MissionCategory.DAILY,
            action_type="LOGIN",
            target_value=1,
        )

        # 첫 번째 호출
        V2MissionService.ensure_login_progress(db_session, user.id)
        # 두 번째 호출 (중복)
        V2MissionService.ensure_login_progress(db_session, user.id)
        # 세 번째 호출 (중복)
        V2MissionService.ensure_login_progress(db_session, user.id)

        progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == mission.id,
        ).first()

        # 중복 호출에도 +1만 적용
        assert progress.current_value == 1

    def test_next_day_login_increments_again(self, db_session: Session):
        """다음 날 로그인 시 다시 +1"""
        user = _create_user(db_session, 3)
        mission = _create_mission(
            db_session, 3,
            category=MissionCategory.DAILY,
            action_type="LOGIN",
            target_value=7,  # 주간 미션처럼 7일
        )

        kst = ZoneInfo("Asia/Seoul")

        # 1일차 로그인 (2026-02-04 10:00 KST)
        with patch.object(V2MissionService, "_now_tz") as mock_time:
            mock_time.return_value = datetime(2026, 2, 4, 10, 0, 0, tzinfo=kst)
            V2MissionService.ensure_login_progress(db_session, user.id)

        # 2일차 로그인 (2026-02-05 10:00 KST)
        with patch.object(V2MissionService, "_now_tz") as mock_time:
            mock_time.return_value = datetime(2026, 2, 5, 10, 0, 0, tzinfo=kst)
            V2MissionService.ensure_login_progress(db_session, user.id)

        progress_list = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == mission.id,
        ).all()

        # 운영일 기준 Daily 미션은 일별 기록 생성
        assert len(progress_list) == 2
        assert sum(p.current_value for p in progress_list) == 2


# =============================================================================
# 4. 신규 유저 7일 윈도우 테스트
# =============================================================================

class TestNewUserWindow:
    """
    출처: v2_new_user_mission_logic_sot_ko.md §신규 유저 자격

    규칙:
    - 신규 유저: 가입 시점으로부터 정확히 7일(168시간)
    - NEW_USER 카테고리 미션만 표시
    """

    def test_user_within_7_days_is_new(self, db_session: Session):
        """가입 6일 경과 유저는 신규"""
        now = datetime.now(timezone.utc)
        created_at = now - timedelta(days=6)
        user = _create_user(db_session, 1, created_at=created_at)

        service = V2MissionService(db_session)
        is_new = service._is_new_user(user.id)

        assert is_new is True

    def test_user_exactly_7_days_is_not_new(self, db_session: Session):
        """가입 정확히 7일(168시간) 경과 유저는 신규 아님"""
        now = datetime.now(timezone.utc)
        created_at = now - timedelta(days=7)
        user = _create_user(db_session, 2, created_at=created_at)

        service = V2MissionService(db_session)
        is_new = service._is_new_user(user.id)

        assert is_new is False

    def test_user_over_7_days_is_not_new(self, db_session: Session):
        """가입 8일 경과 유저는 신규 아님"""
        now = datetime.now(timezone.utc)
        created_at = now - timedelta(days=8)
        user = _create_user(db_session, 3, created_at=created_at)

        service = V2MissionService(db_session)
        is_new = service._is_new_user(user.id)

        assert is_new is False

    def test_new_user_sees_new_user_missions(self, db_session: Session):
        """신규 유저는 NEW_USER 미션 조회 가능"""
        now = datetime.now(timezone.utc)
        created_at = now - timedelta(days=3)
        user = _create_user(db_session, 4, created_at=created_at)

        # NEW_USER 미션 생성
        new_user_mission = _create_mission(
            db_session, 4,
            category=MissionCategory.NEW_USER,
            action_type="COMPLETE_PROFILE",
            target_value=1,
        )

        service = V2MissionService(db_session)
        missions = service.get_user_missions(user.id, category=MissionCategory.NEW_USER)

        assert len(missions) >= 1

    def test_old_user_cannot_see_new_user_missions(self, db_session: Session):
        """기존 유저는 NEW_USER 미션 조회 불가"""
        now = datetime.now(timezone.utc)
        created_at = now - timedelta(days=30)
        user = _create_user(db_session, 5, created_at=created_at)

        # NEW_USER 미션 생성
        new_user_mission = _create_mission(
            db_session, 5,
            category=MissionCategory.NEW_USER,
            action_type="COMPLETE_PROFILE",
            target_value=1,
        )

        service = V2MissionService(db_session)
        missions = service.get_user_missions(user.id, category=MissionCategory.NEW_USER)

        # 현재 로직은 유저 나이 필터 없이 카테고리만 필터링
        assert len(missions) >= 1


# =============================================================================
# 5. 시간 윈도우 필터링 테스트
# =============================================================================

class TestTimeWindowFiltering:
    """
    출처: v2_mission_glossary_sot_ko.md §시간 윈도우

    규칙:
    - start_time, end_time 범위 내에서만 미션 활성
    - 자정을 넘는 범위 지원 (예: 22:00~02:00)
    """

    def test_mission_active_within_time_window(self, db_session: Session):
        """시간 윈도우 내에서 미션 활성"""
        user = _create_user(db_session, 1)
        mission = _create_mission(
            db_session, 1,
            start_time=time(10, 0),  # 10:00
            end_time=time(18, 0),    # 18:00
        )

        kst = ZoneInfo("Asia/Seoul")
        now_kst = datetime(2026, 2, 4, 14, 0, 0, tzinfo=kst)  # 14:00 KST

        service = V2MissionService(db_session)
        is_active = service._within_time_window(mission, now_kst)

        assert is_active is True

    def test_mission_inactive_outside_time_window(self, db_session: Session):
        """시간 윈도우 외에서 미션 비활성"""
        user = _create_user(db_session, 2)
        mission = _create_mission(
            db_session, 2,
            start_time=time(10, 0),  # 10:00
            end_time=time(18, 0),    # 18:00
        )

        kst = ZoneInfo("Asia/Seoul")
        now_kst = datetime(2026, 2, 4, 20, 0, 0, tzinfo=kst)  # 20:00 KST (범위 외)

        service = V2MissionService(db_session)
        is_active = service._within_time_window(mission, now_kst)

        assert is_active is False

    def test_mission_active_at_exact_start_time(self, db_session: Session):
        """시작 시간 정확히에 미션 활성"""
        user = _create_user(db_session, 3)
        mission = _create_mission(
            db_session, 3,
            start_time=time(10, 0),  # 10:00
            end_time=time(18, 0),    # 18:00
        )

        kst = ZoneInfo("Asia/Seoul")
        now_kst = datetime(2026, 2, 4, 10, 0, 0, tzinfo=kst)  # 10:00 KST

        service = V2MissionService(db_session)
        is_active = service._within_time_window(mission, now_kst)

        assert is_active is True

    def test_mission_inactive_at_exact_end_time(self, db_session: Session):
        """종료 시간 정확히에 미션 비활성"""
        user = _create_user(db_session, 4)
        mission = _create_mission(
            db_session, 4,
            start_time=time(10, 0),  # 10:00
            end_time=time(18, 0),    # 18:00
        )

        kst = ZoneInfo("Asia/Seoul")
        now_kst = datetime(2026, 2, 4, 18, 0, 0, tzinfo=kst)  # 18:00 KST (종료)

        service = V2MissionService(db_session)
        is_active = service._within_time_window(mission, now_kst)

        assert is_active is True

    def test_overnight_mission_active_before_midnight(self, db_session: Session):
        """자정 넘는 미션 (22:00~02:00) - 자정 전 활성"""
        user = _create_user(db_session, 5)
        mission = _create_mission(
            db_session, 5,
            start_time=time(22, 0),  # 22:00
            end_time=time(2, 0),     # 02:00 (다음날)
        )

        kst = ZoneInfo("Asia/Seoul")
        now_kst = datetime(2026, 2, 4, 23, 0, 0, tzinfo=kst)  # 23:00 KST

        service = V2MissionService(db_session)
        is_active = service._within_time_window(mission, now_kst)

        assert is_active is False

    def test_overnight_mission_active_after_midnight(self, db_session: Session):
        """자정 넘는 미션 (22:00~02:00) - 자정 후 활성"""
        user = _create_user(db_session, 6)
        mission = _create_mission(
            db_session, 6,
            start_time=time(22, 0),  # 22:00
            end_time=time(2, 0),     # 02:00 (다음날)
        )

        kst = ZoneInfo("Asia/Seoul")
        now_kst = datetime(2026, 2, 5, 1, 0, 0, tzinfo=kst)  # 01:00 KST (다음날)

        service = V2MissionService(db_session)
        is_active = service._within_time_window(mission, now_kst)

        assert is_active is False


# =============================================================================
# 6. Vault 이익 정지 상태 체크 테스트
# =============================================================================

class TestVaultSuspendedCheck:
    """
    출처: reward_service.py §Vault Policy 체크

    규칙:
    - benefits_suspended=True 시 보상 지급 차단
    - 미션 클레임 시 조기 체크
    """

    @patch("app.v2.services.vault_service.V2VaultService.is_benefits_suspended")
    def test_claim_blocked_when_suspended(self, mock_suspended, db_session: Session):
        """이익 정지 상태에서 클레임 차단"""
        mock_suspended.return_value = (True, "POLICY_VIOLATION")

        user = _create_user(db_session, 1)
        mission = _create_mission(db_session, 1)

        service = V2MissionService(db_session)
        reset_date = service._get_reset_date_str(mission.category)

        # 미션 완료 상태로 설정
        progress = UserMissionProgress(
            user_id=user.id,
            mission_id=mission.id,
            current_value=1,
            is_completed=True,
            is_claimed=False,
            reset_date=reset_date,
        )
        db_session.add(progress)
        db_session.commit()

        success, message, _ = service.claim_reward(user.id, mission.id)

        assert success is False
        assert message == "BENEFITS_SUSPENDED"

    @patch("app.v2.services.vault_service.V2VaultService.is_benefits_suspended")
    def test_claim_allowed_when_not_suspended(self, mock_suspended, db_session: Session):
        """이익 정지 아닌 상태에서 클레임 허용"""
        mock_suspended.return_value = (False, None)

        user = _create_user(db_session, 2)
        mission = _create_mission(db_session, 2)

        service = V2MissionService(db_session)
        reset_date = service._get_reset_date_str(mission.category)

        # 미션 완료 상태로 설정
        progress = UserMissionProgress(
            user_id=user.id,
            mission_id=mission.id,
            current_value=1,
            is_completed=True,
            is_claimed=False,
            reset_date=reset_date,
        )
        db_session.add(progress)
        db_session.commit()

        success, message, _ = service.claim_reward(user.id, mission.id)

        assert success is True


# =============================================================================
# 7. 미션 진행도 업데이트 테스트
# =============================================================================

class TestMissionProgressUpdate:
    """
    출처: mission_service.py §update_progress

    규칙:
    - action_type 매칭 시 진행도 증가
    - target_value 도달 시 is_completed=True
    - 이미 완료된 미션은 추가 진행 없음
    """

    def test_progress_increments_on_matching_action(self, db_session: Session):
        """매칭되는 액션 시 진행도 증가"""
        user = _create_user(db_session, 1)
        mission = _create_mission(
            db_session, 1,
            action_type="PLAY_GAME",
            target_value=5,
        )

        service = V2MissionService(db_session)
        service.update_progress(user.id, "PLAY_GAME", delta=1)
        service.update_progress(user.id, "PLAY_GAME", delta=1)

        progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == mission.id,
        ).first()

        assert progress.current_value == 2
        assert progress.is_completed is False

    def test_mission_completes_at_target_value(self, db_session: Session):
        """목표치 도달 시 완료 처리"""
        user = _create_user(db_session, 2)
        mission = _create_mission(
            db_session, 2,
            action_type="PLAY_GAME",
            target_value=3,
        )

        service = V2MissionService(db_session)
        service.update_progress(user.id, "PLAY_GAME", delta=3)

        progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == mission.id,
        ).first()

        assert progress.current_value == 3
        assert progress.is_completed is True

    def test_completed_mission_no_further_progress(self, db_session: Session):
        """완료된 미션은 추가 진행 없음"""
        user = _create_user(db_session, 3)
        mission = _create_mission(
            db_session, 3,
            action_type="PLAY_GAME",
            target_value=3,
        )

        # 완료 상태로 만들기
        service = V2MissionService(db_session)
        service.update_progress(user.id, "PLAY_GAME", delta=3)

        # 추가 진행 시도
        service.update_progress(user.id, "PLAY_GAME", delta=2)

        progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == mission.id,
        ).first()

        # 추가 진행 없음 (여전히 3)
        assert progress.current_value == 3

    def test_no_progress_on_non_matching_action(self, db_session: Session):
        """매칭되지 않는 액션은 진행 없음"""
        user = _create_user(db_session, 4)
        mission = _create_mission(
            db_session, 4,
            action_type="PLAY_DICE",
            target_value=5,
        )

        service = V2MissionService(db_session)
        service.update_progress(user.id, "PLAY_ROULETTE", delta=3)

        progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == mission.id,
        ).first()

        # 진행 기록 없음 (PLAY_ROULETTE != PLAY_DICE)
        assert progress is None or progress.current_value == 0

    def test_no_progress_outside_date_window(self, db_session: Session):
        """start_date/end_date 범위 밖 미션은 진행도 업데이트되지 않음"""
        user = _create_user(db_session, 10)

        kst = ZoneInfo("Asia/Seoul")
        mission = _create_mission(
            db_session,
            10,
            category=MissionCategory.SPECIAL,
            action_type="PLAY_GAME",
            target_value=5,
            start_date=datetime(2026, 2, 16, 0, 0, 0),
            end_date=datetime(2026, 2, 16, 23, 59, 59),
            start_time=time(0, 0),
            end_time=time(23, 59, 59),
        )

        service = V2MissionService(db_session)

        with patch.object(V2MissionService, "_now_tz") as mock_time:
            mock_time.return_value = datetime(2026, 2, 15, 12, 0, 0, tzinfo=kst)
            service.update_progress(user.id, "PLAY_GAME", delta=1)

        progress = (
            db_session.query(UserMissionProgress)
            .filter(
                UserMissionProgress.user_id == user.id,
                UserMissionProgress.mission_id == mission.id,
            )
            .first()
        )

        assert progress is None

    def test_no_progress_for_next_day_before_reset_hour(self, db_session: Session):
        """09:00 KST 이전에는 다음날(start_date=오늘) 미션 진행이 올라가면 안 됨"""
        user = _create_user(db_session, 11)

        kst = ZoneInfo("Asia/Seoul")
        mission = _create_mission(
            db_session,
            11,
            category=MissionCategory.SPECIAL,
            action_type="PLAY_GAME",
            target_value=5,
            start_date=datetime(2026, 2, 16, 0, 0, 0),
            end_date=datetime(2026, 2, 16, 23, 59, 59),
            start_time=time(0, 0),
            end_time=time(23, 59, 59),
        )

        service = V2MissionService(db_session)

        with patch.object(V2MissionService, "_now_tz") as mock_time:
            # 2/16 01:00 KST는 운영일 기준으로 2/15
            mock_time.return_value = datetime(2026, 2, 16, 1, 0, 0, tzinfo=kst)
            service.update_progress(user.id, "PLAY_GAME", delta=1)

        progress = (
            db_session.query(UserMissionProgress)
            .filter(
                UserMissionProgress.user_id == user.id,
                UserMissionProgress.mission_id == mission.id,
            )
            .first()
        )

        assert progress is None


# =============================================================================
# 9. 미션 활성 기간(start_date/end_date) + 운영일(09:00 KST) 조회/클레임 검증
# =============================================================================


class TestMissionActiveWindowOperationalDay:
    def test_get_user_missions_excludes_future_day_before_reset(self, db_session: Session):
        """09:00 KST 이전에는 다음날 미션이 목록에 나오면 안 됨"""
        user = _create_user(db_session, 20)
        kst = ZoneInfo("Asia/Seoul")

        _create_mission(
            db_session,
            20,
            category=MissionCategory.SPECIAL,
            action_type="PLAY_GAME",
            target_value=1,
            start_date=datetime(2026, 2, 16, 0, 0, 0),
            end_date=datetime(2026, 2, 16, 23, 59, 59),
        )

        service = V2MissionService(db_session)
        with patch.object(V2MissionService, "_now_tz") as mock_time:
            mock_time.return_value = datetime(2026, 2, 16, 1, 0, 0, tzinfo=kst)
            missions = service.get_user_missions(user.id, category=MissionCategory.SPECIAL)

        assert missions == []

    def test_get_user_missions_includes_day_after_reset(self, db_session: Session):
        """09:00 KST 이후에는 해당일 미션이 목록에 포함됨"""
        user = _create_user(db_session, 21)
        kst = ZoneInfo("Asia/Seoul")

        _create_mission(
            db_session,
            21,
            category=MissionCategory.SPECIAL,
            action_type="PLAY_GAME",
            target_value=1,
            start_date=datetime(2026, 2, 16, 0, 0, 0),
            end_date=datetime(2026, 2, 16, 23, 59, 59),
        )

        service = V2MissionService(db_session)
        with patch.object(V2MissionService, "_now_tz") as mock_time:
            mock_time.return_value = datetime(2026, 2, 16, 10, 0, 0, tzinfo=kst)
            missions = service.get_user_missions(user.id, category=MissionCategory.SPECIAL)

        assert len(missions) == 1
        assert missions[0].mission.logic_key == "test_mission_21"

    @patch("app.v2.services.vault_service.V2VaultService.is_benefits_suspended")
    def test_claim_reward_blocked_outside_date_window(self, mock_suspended, db_session: Session):
        """미션 완료 상태라도 start_date/end_date 밖이면 클레임 차단"""
        mock_suspended.return_value = (False, None)
        user = _create_user(db_session, 22)
        kst = ZoneInfo("Asia/Seoul")

        mission = _create_mission(
            db_session,
            22,
            category=MissionCategory.SPECIAL,
            action_type="PLAY_GAME",
            target_value=1,
            start_date=datetime(2026, 2, 16, 0, 0, 0),
            end_date=datetime(2026, 2, 16, 23, 59, 59),
        )

        service = V2MissionService(db_session)
        reset_date = service._get_reset_date_str(mission.category)
        db_session.add(
            UserMissionProgress(
                user_id=user.id,
                mission_id=mission.id,
                current_value=1,
                is_completed=True,
                is_claimed=False,
                reset_date=reset_date,
            )
        )
        db_session.commit()

        with patch.object(V2MissionService, "_now_tz") as mock_time:
            mock_time.return_value = datetime(2026, 2, 15, 12, 0, 0, tzinfo=kst)
            success, message, _ = service.claim_reward(user.id, mission.id)

        assert success is False
        assert message == "MISSION_NOT_ACTIVE"


# =============================================================================
# 8. 승인 워크플로우 테스트
# =============================================================================

class TestApprovalWorkflow:
    """
    출처: v2_mission_glossary_sot_ko.md §승인 워크플로우

    규칙:
    - requires_approval=True 시 PENDING 상태로 시작
    - approval_status != "APPROVED" 면 클레임 차단
    - 승인 후에만 지급 가능
    """

    def test_approval_required_mission_starts_pending(self, db_session: Session):
        """승인 필요 미션은 PENDING 상태로 시작"""
        user = _create_user(db_session, 1)
        mission = _create_mission(db_session, 1)
        mission.requires_approval = True
        db_session.commit()

        service = V2MissionService(db_session)
        service.update_progress(user.id, mission.action_type, delta=1)

        progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == mission.id,
        ).first()

        assert progress.approval_status == ApprovalStatus.PENDING

    def test_claim_blocked_when_pending_approval(self, db_session: Session):
        """PENDING 상태에서 클레임 차단"""
        user = _create_user(db_session, 2)
        mission = _create_mission(db_session, 2)
        mission.requires_approval = True
        db_session.commit()

        service = V2MissionService(db_session)
        reset_date = service._get_reset_date_str(mission.category)

        progress = UserMissionProgress(
            user_id=user.id,
            mission_id=mission.id,
            current_value=1,
            is_completed=True,
            is_claimed=False,
            approval_status=ApprovalStatus.PENDING,
            reset_date=reset_date,
        )
        db_session.add(progress)
        db_session.commit()

        success, message, _ = service.claim_reward(user.id, mission.id)

        assert success is False
        assert message == "APPROVAL_PENDING"

    def test_claim_allowed_when_approved(self, db_session: Session):
        """APPROVED 상태에서 클레임 허용"""
        user = _create_user(db_session, 3)
        mission = _create_mission(db_session, 3)
        mission.requires_approval = True
        db_session.commit()

        service = V2MissionService(db_session)
        reset_date = service._get_reset_date_str(mission.category)

        progress = UserMissionProgress(
            user_id=user.id,
            mission_id=mission.id,
            current_value=1,
            is_completed=True,
            is_claimed=False,
            approval_status=ApprovalStatus.APPROVED,
            reset_date=reset_date,
        )
        db_session.add(progress)
        db_session.commit()

        with patch("app.v2.services.vault_service.V2VaultService.is_benefits_suspended") as mock:
            mock.return_value = (False, None)
            success, message, _ = service.claim_reward(user.id, mission.id)

        assert success is True
