"""
V2 스트릭(연속 미션) 엣지케이스 테스트

출처:
- docs/v2_specs/02_game/v2_attendance_streak_logic_sot_ko.md
- docs/v2_specs/03_api/v2_mission_streak_api_contract_ko.md
- docs/v2_specs/90_troubleshooting/W06_MISSION_troubleshooting.md

테스트 대상:
1. 스트릭 증가/리셋 로직
2. 마일스톤 보상 클레임 (중복 방지)
3. Hot/Legend 배율 적용
4. 운영일 계산 (09:00 KST 리셋)
5. Vault 이익 정지 상태 체크
6. 관리자 도구 (reset, set_count, force_grant)
"""

from datetime import datetime, timedelta, timezone, date
from typing import Generator
from unittest.mock import patch, MagicMock
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base_class import Base
from app.v2.models.user import V2User
from app.v2.models.user_event_log import UserEventLog
from app.v2.services.mission_service import V2MissionService
from app.v2.services.streak_service import V2StreakService


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


def _create_user(
    db: Session,
    user_id: int,
    play_streak: int = 0,
    last_play_date: date | None = None,
) -> V2User:
    """테스트용 유저 생성"""
    user = V2User(
        id=user_id,
        cc_id=f"streak_test_{user_id}",
        nickname=f"StreakTest{user_id}",
        telegram_id=f"tg_{user_id}",
        created_at=datetime.now(timezone.utc) - timedelta(days=30),
        total_charge_amount=10000,
        play_streak=play_streak,
        last_play_date=last_play_date,
    )
    db.add(user)
    db.commit()
    return user


# =============================================================================
# 1. 스트릭 증가/리셋 로직 테스트
# =============================================================================

class TestStreakIncrementReset:
    """
    출처: v2_attendance_streak_logic_sot_ko.md §연속성 및 초기화

    규칙:
    - 어제 플레이 + 오늘 플레이 → streak + 1
    - 어제 미플레이 → streak = 1 (리셋)
    - 같은 날 중복 플레이 → 변화 없음
    """

    def test_consecutive_day_increments_streak(self, db_session: Session):
        """연속 플레이 시 스트릭 증가"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()
        yesterday = today - timedelta(days=1)

        user = _create_user(db_session, 1, play_streak=5, last_play_date=yesterday)

        service = V2MissionService(db_session)
        service.sync_play_streak(user.id, now_tz=datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst))

        db_session.refresh(user)
        assert user.play_streak == 6  # 5 + 1
        assert user.last_play_date == today

    def test_gap_day_resets_streak(self, db_session: Session):
        """1일 이상 간격 시 스트릭 리셋"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()
        two_days_ago = today - timedelta(days=2)

        user = _create_user(db_session, 2, play_streak=10, last_play_date=two_days_ago)

        service = V2MissionService(db_session)
        service.sync_play_streak(user.id, now_tz=datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst))

        db_session.refresh(user)
        assert user.play_streak == 1  # 리셋
        assert user.last_play_date == today

    def test_same_day_no_change(self, db_session: Session):
        """같은 날 중복 플레이 시 변화 없음"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 3, play_streak=7, last_play_date=today)

        service = V2MissionService(db_session)
        service.sync_play_streak(user.id, now_tz=datetime(2026, 2, 4, 15, 0, 0, tzinfo=kst))

        db_session.refresh(user)
        assert user.play_streak == 7  # 변화 없음
        assert user.last_play_date == today

    def test_first_play_starts_streak_at_one(self, db_session: Session):
        """첫 플레이 시 스트릭 1로 시작"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 4, play_streak=0, last_play_date=None)

        service = V2MissionService(db_session)
        service.sync_play_streak(user.id, now_tz=datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst))

        db_session.refresh(user)
        assert user.play_streak == 1
        assert user.last_play_date == today

    def test_streak_reset_creates_event_log(self, db_session: Session):
        """스트릭 리셋 시 이벤트 로그 생성"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()
        three_days_ago = today - timedelta(days=3)

        user = _create_user(db_session, 5, play_streak=15, last_play_date=three_days_ago)

        service = V2MissionService(db_session)
        service.sync_play_streak(user.id, now_tz=datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst))

        # 리셋 이벤트 로그 확인
        event = db_session.query(UserEventLog).filter(
            UserEventLog.user_id == user.id,
            UserEventLog.event_name == "streak.reset",
        ).first()

        assert event is not None


# =============================================================================
# 2. 마일스톤 보상 클레임 테스트 (중복 방지)
# =============================================================================

class TestMilestoneClaimDeduplication:
    """
    출처: streak_service.py §마일스톤 클레임 중복 방지

    규칙:
    - 동일 마일스톤은 한 번만 클레임 가능
    - UserEventLog의 event_name으로 중복 체크
    - event_name = "streak.reward_grant.{day}.{hit_date}"
    """

    def test_milestone_claim_success(self, db_session: Session):
        """마일스톤 클레임 성공"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 1, play_streak=3, last_play_date=today)

        service = V2StreakService(db_session)
        with patch("app.v2.services.reward_service.V2RewardService.deliver") as mock_deliver:
            mock_deliver.return_value = None
            result = service.claim_streak_reward(user.id)

        assert result["success"] is True

    def test_duplicate_claim_blocked(self, db_session: Session):
        """중복 클레임 차단"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 2, play_streak=3, last_play_date=today)

        service = V2StreakService(db_session)

        # 첫 번째 클레임
        with patch("app.v2.services.reward_service.V2RewardService.deliver") as mock_deliver:
            mock_deliver.return_value = None
            service.claim_streak_reward(user.id)

        # 두 번째 클레임 (중복)
        with patch("app.v2.services.reward_service.V2RewardService.deliver") as mock_deliver:
            mock_deliver.return_value = None
            result = service.claim_streak_reward(user.id)

        assert result["success"] is False
        assert result["message"] == "NO_CLAIMABLE_REWARD"

    def test_event_log_created_on_claim(self, db_session: Session):
        """클레임 시 이벤트 로그 생성"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 3, play_streak=7, last_play_date=today)

        service = V2StreakService(db_session)
        with patch("app.v2.services.reward_service.V2RewardService.deliver") as mock_deliver:
            mock_deliver.return_value = None
            service.claim_streak_reward(user.id)

        # 이벤트 로그 확인
        event = db_session.query(UserEventLog).filter(
            UserEventLog.user_id == user.id,
            UserEventLog.event_name.like("streak.reward_grant.7.%"),
        ).first()

        assert event is not None


# =============================================================================
# 3. Hot/Legend 배율 적용 테스트
# =============================================================================

class TestStreakMultiplier:
    """
    출처: v2_attendance_streak_logic_sot_ko.md §보상 배율

    규칙:
    - 기본: 1.0x
    - Hot (3일 이상): 1.2x
    - Legend (7일 이상): 1.5x
    """

    def test_default_multiplier_below_3_days(self):
        """3일 미만은 기본 배율 1.0"""
        service = V2StreakService(MagicMock())
        service.settings.streak_multiplier_enabled = True
        multiplier = service._get_streak_multiplier(2)
        assert multiplier == 1.0

    def test_hot_multiplier_at_3_days(self):
        """3일은 Hot 배율 1.2"""
        service = V2StreakService(MagicMock())
        service.settings.streak_multiplier_enabled = True
        multiplier = service._get_streak_multiplier(3)
        assert multiplier == service.settings.streak_hot_multiplier

    def test_hot_multiplier_between_3_and_7_days(self):
        """3~6일은 Hot 배율 1.2"""
        for days in [3, 4, 5, 6]:
            service = V2StreakService(MagicMock())
            service.settings.streak_multiplier_enabled = True
            multiplier = service._get_streak_multiplier(days)
            assert multiplier == service.settings.streak_hot_multiplier

    def test_legend_multiplier_at_7_days(self):
        """7일은 Legend 배율 1.5"""
        service = V2StreakService(MagicMock())
        service.settings.streak_multiplier_enabled = True
        multiplier = service._get_streak_multiplier(7)
        assert multiplier == service.settings.streak_legend_multiplier

    def test_legend_multiplier_above_7_days(self):
        """7일 초과도 Legend 배율 1.5"""
        for days in [7, 10, 14, 30, 100]:
            service = V2StreakService(MagicMock())
            service.settings.streak_multiplier_enabled = True
            multiplier = service._get_streak_multiplier(days)
            assert multiplier == service.settings.streak_legend_multiplier


# =============================================================================
# 4. 다음 마일스톤 계산 테스트
# =============================================================================

class TestNextMilestoneCalculation:
    """
    출처: streak_service.py §다음 마일스톤 계산

    규칙:
    - streak < 3: next = 3
    - 3 <= streak < 7: next = 7
    - streak >= 7: next = ((streak // 7) + 1) * 7
    """

    def test_next_milestone_when_streak_0(self, db_session: Session):
        """스트릭 0일 때 다음 마일스톤 3"""
        user = _create_user(db_session, 1, play_streak=0, last_play_date=None)
        service = V2StreakService(db_session)
        info = service.get_user_streak_info(user.id)
        assert info.next_milestone == 3

    def test_next_milestone_when_streak_2(self, db_session: Session):
        """스트릭 2일 때 다음 마일스톤 3"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()
        user = _create_user(db_session, 2, play_streak=2, last_play_date=today)
        service = V2StreakService(db_session)
        info = service.get_user_streak_info(user.id)
        assert info.next_milestone == 3

    def test_next_milestone_when_streak_3(self, db_session: Session):
        """스트릭 3일 때 다음 마일스톤 7"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()
        user = _create_user(db_session, 3, play_streak=3, last_play_date=today)
        service = V2StreakService(db_session)
        info = service.get_user_streak_info(user.id)
        assert info.next_milestone == 7

    def test_next_milestone_when_streak_6(self, db_session: Session):
        """스트릭 6일 때 다음 마일스톤 7"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()
        user = _create_user(db_session, 4, play_streak=6, last_play_date=today)
        service = V2StreakService(db_session)
        info = service.get_user_streak_info(user.id)
        assert info.next_milestone == 7

    def test_next_milestone_when_streak_7(self, db_session: Session):
        """스트릭 7일 때 다음 마일스톤 14"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()
        user = _create_user(db_session, 5, play_streak=7, last_play_date=today)
        service = V2StreakService(db_session)
        info = service.get_user_streak_info(user.id)
        assert info.next_milestone == 14

    def test_next_milestone_when_streak_10(self, db_session: Session):
        """스트릭 10일 때 다음 마일스톤 14"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()
        user = _create_user(db_session, 6, play_streak=10, last_play_date=today)
        service = V2StreakService(db_session)
        info = service.get_user_streak_info(user.id)
        assert info.next_milestone == 14

    def test_next_milestone_when_streak_14(self, db_session: Session):
        """스트릭 14일 때 다음 마일스톤 21"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()
        user = _create_user(db_session, 7, play_streak=14, last_play_date=today)
        service = V2StreakService(db_session)
        info = service.get_user_streak_info(user.id)
        assert info.next_milestone == 21

    def test_next_milestone_when_streak_30(self, db_session: Session):
        """스트릭 30일 때 다음 마일스톤 35"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()
        user = _create_user(db_session, 8, play_streak=30, last_play_date=today)
        service = V2StreakService(db_session)
        info = service.get_user_streak_info(user.id)
        assert info.next_milestone == 35


# =============================================================================
# 5. 스트릭 정보 조회 테스트
# =============================================================================

class TestStreakInfoRetrieval:
    """
    출처: streak_service.py §get_user_streak_info

    규칙:
    - current_streak: 현재 연속일
    - is_hot: streak >= 3
    - is_legend: streak >= 7
    - next_milestone: 다음 마일스톤
    - claimable_day: 클레임 가능한 마일스톤 (있으면)
    """

    def test_streak_info_basic(self, db_session: Session):
        """기본 스트릭 정보 조회"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 1, play_streak=5, last_play_date=today)

        service = V2StreakService(db_session)
        info = service.get_user_streak_info(user.id)

        assert info.current_streak == 5
        assert info.is_hot is True  # 3 이상
        assert info.is_legend is False  # 7 미만
        assert info.next_milestone == 7

    def test_streak_info_legend(self, db_session: Session):
        """레전드 스트릭 정보 조회"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 2, play_streak=10, last_play_date=today)

        service = V2StreakService(db_session)
        info = service.get_user_streak_info(user.id)

        assert info.current_streak == 10
        assert info.is_hot is True
        assert info.is_legend is True
        assert info.next_milestone == 14

    def test_streak_info_new_user(self, db_session: Session):
        """신규 유저 (스트릭 0) 정보 조회"""
        user = _create_user(db_session, 3, play_streak=0, last_play_date=None)

        service = V2StreakService(db_session)
        info = service.get_user_streak_info(user.id)

        assert info.current_streak == 0
        assert info.is_hot is False
        assert info.is_legend is False
        assert info.next_milestone == 3


# =============================================================================
# 6. Vault 이익 정지 상태 체크 테스트
# =============================================================================

# =============================================================================
# 7. 관리자 도구 테스트
# =============================================================================

class TestAdminStreakTools:
    """
    출처: streak_service.py §관리자 도구

    메서드:
    - reset_user_streak: 스트릭 초기화
    - set_streak_count: 스트릭 직접 설정
    - force_grant_milestone: 마일스톤 강제 지급
    """

    def test_admin_reset_user_streak(self, db_session: Session):
        """관리자 스트릭 초기화"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 1, play_streak=15, last_play_date=today)

        service = V2StreakService(db_session)
        result = service.reset_user_streak(user.id, commit=True)

        db_session.refresh(user)
        assert result is True
        assert user.play_streak == 0
        assert user.last_play_date is None

    def test_admin_set_streak_count(self, db_session: Session):
        """관리자 스트릭 직접 설정"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 2, play_streak=5, last_play_date=today)

        service = V2StreakService(db_session)
        result = service.set_streak_count(user.id, streak_days=20)

        db_session.refresh(user)
        assert result["success"] is True
        assert user.play_streak == 20

    def test_admin_set_streak_count_to_zero(self, db_session: Session):
        """관리자 스트릭 0으로 설정 (리셋)"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 3, play_streak=10, last_play_date=today)

        service = V2StreakService(db_session)
        result = service.set_streak_count(user.id, streak_days=0)

        db_session.refresh(user)
        assert result["success"] is True
        assert user.play_streak == 0
        assert user.last_play_date is None

    def test_admin_force_grant_milestone(self, db_session: Session):
        """관리자 마일스톤 강제 지급"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 4, play_streak=3, last_play_date=today)

        service = V2StreakService(db_session)
        with patch("app.v2.services.reward_service.V2RewardService.deliver") as mock_deliver:
            mock_deliver.return_value = None
            result = service.force_grant_milestone(user.id, milestone_day=3)

        assert result["success"] is True

    def test_admin_force_grant_already_granted(self, db_session: Session):
        """관리자 강제 지급 - 이미 지급된 경우 차단"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 5, play_streak=7, last_play_date=today)

        service = V2StreakService(db_session)

        # 첫 번째 강제 지급
        with patch("app.v2.services.reward_service.V2RewardService.deliver") as mock_deliver:
            mock_deliver.return_value = None
            service.force_grant_milestone(user.id, milestone_day=7)

        # 두 번째 강제 지급 (중복)
        with patch("app.v2.services.reward_service.V2RewardService.deliver") as mock_deliver:
            mock_deliver.return_value = None
            result = service.force_grant_milestone(user.id, milestone_day=7)

        assert result["success"] is False
        assert result["message"] == "ALREADY_GRANTED"


# =============================================================================
# 8. 마일스톤 진행 현황 테스트
# =============================================================================

class TestMilestoneProgress:
    """
    출처: streak_service.py §get_milestone_progress

    규칙:
    - 각 마일스톤별 달성/클레임 여부 표시
    - [3일, 7일, 14일, 21일, 28일, ...]
    """

    def test_milestone_progress_shows_achieved(self, db_session: Session):
        """달성한 마일스톤 표시"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 1, play_streak=10, last_play_date=today)

        service = V2StreakService(db_session)
        progress = service.get_milestone_progress(user.id)

        # 3일, 7일 마일스톤은 달성됨
        assert any(p["day"] == 3 and p["achieved"] is True for p in progress)
        assert any(p["day"] == 7 and p["achieved"] is True for p in progress)
        # 14일 마일스톤은 미달성
        assert any(p["day"] == 14 and p["achieved"] is False for p in progress)

    def test_milestone_progress_shows_claimed(self, db_session: Session):
        """클레임한 마일스톤 표시"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 2, play_streak=7, last_play_date=today)

        # 3일 마일스톤 클레임 이벤트 로그 생성
        hit_date = user.last_play_date - timedelta(days=(user.play_streak - 3))
        event_name = f"streak.reward_grant.3.{hit_date.isoformat()}"
        db_session.add(
            UserEventLog(
                user_id=user.id,
                feature_type="STREAK",
                event_name=event_name,
                meta_json={"reason": "TEST"},
            )
        )
        db_session.commit()

        service = V2StreakService(db_session)
        progress = service.get_milestone_progress(user.id)

        # 3일 마일스톤은 클레임됨
        assert any(p["day"] == 3 and p["claimed"] is True for p in progress)
        # 7일 마일스톤은 미클레임
        assert any(p["day"] == 7 and p["claimed"] is False for p in progress)


# =============================================================================
# 9. 클레임 가능 일수 계산 테스트
# =============================================================================

class TestClaimableDayComputation:
    """
    출처: streak_service.py §compute_claimable_day

    규칙:
    - 스트릭이 마일스톤 이상이고 미클레임 시 클레임 가능
    - 가장 낮은 미클레임 마일스톤 반환
    """

    def test_claimable_day_3_when_streak_3(self, db_session: Session):
        """스트릭 3일일 때 클레임 가능 일수 3"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 1, play_streak=3, last_play_date=today)

        service = V2StreakService(db_session)
        claimable = service.compute_claimable_day(user.id)

        assert claimable == 3

    def test_claimable_day_7_when_streak_7_and_3_claimed(self, db_session: Session):
        """3일 클레임 후 스트릭 7일일 때 클레임 가능 일수 7"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 2, play_streak=7, last_play_date=today)

        # 3일 마일스톤 클레임 이벤트 로그 생성
        hit_date = user.last_play_date - timedelta(days=(user.play_streak - 3))
        event_name = f"streak.reward_grant.3.{hit_date.isoformat()}"
        db_session.add(
            UserEventLog(
                user_id=user.id,
                feature_type="STREAK",
                event_name=event_name,
                meta_json={"reason": "TEST"},
            )
        )
        db_session.commit()

        service = V2StreakService(db_session)
        claimable = service.compute_claimable_day(user.id)

        assert claimable == 7

    def test_no_claimable_day_when_all_claimed(self, db_session: Session):
        """모든 마일스톤 클레임 시 클레임 가능 일수 없음"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 3, play_streak=7, last_play_date=today)

        # 3일, 7일 마일스톤 모두 클레임 이벤트 로그 생성
        hit_date_3 = user.last_play_date - timedelta(days=(user.play_streak - 3))
        hit_date_7 = user.last_play_date - timedelta(days=(user.play_streak - 7))
        db_session.add(
            UserEventLog(
                user_id=user.id,
                feature_type="STREAK",
                event_name=f"streak.reward_grant.3.{hit_date_3.isoformat()}",
                meta_json={"reason": "TEST"},
            )
        )
        db_session.add(
            UserEventLog(
                user_id=user.id,
                feature_type="STREAK",
                event_name=f"streak.reward_grant.7.{hit_date_7.isoformat()}",
                meta_json={"reason": "TEST"},
            )
        )
        db_session.commit()

        service = V2StreakService(db_session)
        claimable = service.compute_claimable_day(user.id)

        # 다음 마일스톤(14일) 미도달이므로 None
        assert claimable is None

    def test_no_claimable_day_when_streak_below_first_milestone(self, db_session: Session):
        """스트릭 3일 미만일 때 클레임 가능 일수 없음"""
        kst = ZoneInfo("Asia/Seoul")
        today = datetime(2026, 2, 4, 12, 0, 0, tzinfo=kst).date()

        user = _create_user(db_session, 4, play_streak=2, last_play_date=today)

        service = V2StreakService(db_session)
        claimable = service.compute_claimable_day(user.id)

        assert claimable is None
