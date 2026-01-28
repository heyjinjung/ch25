import pytest
from datetime import datetime, timedelta, date, time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from zoneinfo import ZoneInfo

from app.db.base_class import Base
from app.models.mission import Mission, MissionCategory, MissionRewardType, UserMissionProgress
from app.models.user import User
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.v2.services.mission_service import V2MissionService
from app.core.config import get_settings

@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    import app.db.base  # noqa: F401
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()

def _seed_user(db, user_id=1, created_at=None):
    if created_at is None:
        created_at = datetime.utcnow()
    user = User(
        id=user_id, 
        external_id=f"cc_{user_id}", 
        nickname=f"user_{user_id}",
        created_at=created_at,
        vault_locked_balance=0
    )
    db.add(user)
    db.commit()
    return user

def _add_deposit(db, user_id, amount, kst_date=None):
    if kst_date is None:
        kst_date = date.today()
    delta = ExternalRankingDailyDepositDelta(
        user_id=user_id,
        kst_date=kst_date,
        deposit_delta=amount
    )
    db.add(delta)
    db.commit()

class TestMissionEdgeCases:
    """V2 미션 시스템 - 엣지케이스 및 정책 준수 테스트"""

    def test_strict_vault_policy_suspension_on_claim(self, db_session):
        """[Strict Vault Policy] 혜택 중단 상태(7일 무입금)에서 보상 수령 차단"""
        user = _seed_user(db_session, user_id=1)
        # 입금 내역 없음 -> BENEFITS_SUSPENDED
        
        mission = Mission(
            title="테스트 미션",
            logic_key="TEST_MISSION",
            action_type="TEST_ACTION",
            target_value=1,
            reward_type=MissionRewardType.POINT,
            reward_amount=1000,
            category=MissionCategory.DAILY,
            is_active=True
        )
        db_session.add(mission)
        db_session.commit()
        
        service = V2MissionService(db_session)
        service.update_progress(user.id, "TEST_ACTION", delta=1)
        
        # 1. 제재 상태에서 수령 시도
        ok, msg, amount = service.claim_reward(user.id, mission.id)
        assert ok is False
        assert msg == "BENEFITS_SUSPENDED"

        # 2. 입금 발생 (제재 해제)
        _add_deposit(db_session, user.id, 10000)
        
        # 3. 재수령 시도 -> 성공
        ok, msg, amount = service.claim_reward(user.id, mission.id)
        assert ok is True
        assert amount == 1000

    def test_streak_reset_on_skipped_day(self, db_session):
        """연속 플레이 중 하루를 건너뛰면 스트릭이 1로 초기화되는지 확인"""
        user = _seed_user(db_session, user_id=2)
        service = V2MissionService(db_session)
        
        # Day 1: 어제 플레이함
        yesterday = date.today() - timedelta(days=1)
        user.last_play_date = yesterday
        user.play_streak = 5
        db_session.commit()
        
        # 오늘 플레이 -> 스트릭 6
        service.update_progress(user.id, "PLAY_GAME", delta=1)
        db_session.refresh(user)
        assert user.play_streak == 6
        
        # Day 2: 이틀 전으로 설정 (어제를 건너뜀)
        user.last_play_date = date.today() - timedelta(days=2)
        user.play_streak = 6
        db_session.commit()
        
        # 오늘 플레이 -> 스트릭 1로 초기화
        service.update_progress(user.id, "PLAY_GAME", delta=1)
        db_session.refresh(user)
        assert user.play_streak == 1

    def test_new_user_mission_exclusion_for_old_users(self, db_session):
        """신규 유저 미션은 가입 7일이 지난 유저에게 노출되거나 진행되지 않아야 함"""
        # 10일 전 가입 유저
        old_user = _seed_user(db_session, user_id=3, created_at=datetime.utcnow() - timedelta(days=10))
        
        new_user_mission = Mission(
            title="웰컴 미션",
            logic_key="WELCOME",
            action_type="LOGIN",
            target_value=1,
            reward_type=MissionRewardType.DIAMOND,
            reward_amount=1,
            category=MissionCategory.NEW_USER,
            is_active=True
        )
        db_session.add(new_user_mission)
        db_session.commit()
        
        service = V2MissionService(db_session)
        updated = service.update_progress(old_user.id, "LOGIN", delta=1)
        
        # 진행된 미션 리스트에 웰컴 미션이 없어야 함
        assert len(updated) == 0
        
        progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == old_user.id,
            UserMissionProgress.mission_id == new_user_mission.id
        ).first()
        assert progress is None

    def test_mission_time_window_restriction(self, db_session):
        """특정 시간대 전용 미션이 시간 외에 진행되지 않는지 확인"""
        user = _seed_user(db_session, user_id=4)
        
        # 밤 10시 ~ 12시 전용 미션
        night_mission = Mission(
            title="심야 미션",
            logic_key="NIGHT",
            action_type="PLAY_GAME",
            target_value=1,
            reward_type=MissionRewardType.DIAMOND,
            reward_amount=1,
            category=MissionCategory.DAILY,
            start_time=time(22, 0),
            end_time=time(23, 59),
            is_active=True
        )
        db_session.add(night_mission)
        db_session.commit()
        
        service = V2MissionService(db_session)
        
        # 현재 시간이 낮 12시라고 가정 (tz-aware datetime을 mock하긴 번거로우니 로직 체크)
        # service._now_tz() 가 MissionService 내부에 있으므로, patch가 필요할 수 있으나
        # 여기서는 logic_key로 직접 필터링되므로 manually check
        
        # 1. 시간 외 (낮 12시) -> 진행 안됨
        # (테스트 환경의 current time에 의존하므로, service의 now_tz 리턴 분리를 고려하거나 
        # 단순히 mission의 window 체크 로직이 service에서 호출되는지 확인)
        
        # 이 테스트를 위해 _now_tz 를 override한 subclass 사용 고려 가능
        class MockMissionService(V2MissionService):
            def _now_tz(self):
                return datetime.combine(date.today(), time(12, 0), tzinfo=ZoneInfo("Asia/Seoul"))

        mock_service = MockMissionService(db_session)
        updated = mock_service.update_progress(user.id, "PLAY_GAME", delta=1)
        assert len(updated) == 0
        
        # 2. 시간 내 (밤 11시) -> 진행됨
        class MockNightService(V2MissionService):
            def _now_tz(self):
                return datetime.combine(date.today(), time(23, 0), tzinfo=ZoneInfo("Asia/Seoul"))
        
        night_service = MockNightService(db_session)
        updated = night_service.update_progress(user.id, "PLAY_GAME", delta=1)
        assert len(updated) == 1
        assert updated[0].is_completed is True

    def test_idempotent_claim_prevention(self, db_session):
        """중복 보상 수령 방지 테스트"""
        user = _seed_user(db_session, user_id=5)
        _add_deposit(db_session, user.id, 1000) # 활성 상태
        
        mission = Mission(
            title="중복 방지 테스트",
            logic_key="IDEM_TEST",
            action_type="ACTION",
            target_value=1,
            reward_type=MissionRewardType.POINT,
            reward_amount=500,
            category=MissionCategory.DAILY,
            is_active=True
        )
        db_session.add(mission)
        db_session.commit()
        
        service = V2MissionService(db_session)
        service.update_progress(user.id, "ACTION", delta=1)
        
        # 1차 수령 -> 성공
        ok1, msg1, amt1 = service.claim_reward(user.id, mission.id)
        assert ok1 is True
        assert amt1 == 500
        
        # 2차 수령 -> 실패 (ALREADY_CLAIMED)
        ok2, msg2, amt2 = service.claim_reward(user.id, mission.id)
        assert ok2 is False
        assert msg2 == "ALREADY_CLAIMED"

    def test_streak_milestone_claim_eligibility(self, db_session):
        """스트릭 마일스톤 보상 수령 자격 테스트"""
        user = _seed_user(db_session, user_id=6)
        _add_deposit(db_session, user.id, 1000)

        user.play_streak = 3
        user.last_play_date = date.today()
        db_session.commit()
        
        service = V2MissionService(db_session)
        
        # 3일차 보상 수령 시도
        from app.v2.services.ui_config_service import UiConfigService
        UiConfigService.upsert(db_session, "streak_reward_rules", {
            "rules": [
                {"day": 3, "enabled": True, "grants": [{"kind": "WALLET", "token_type": "ROULETTE_TICKET", "amount": 1}]},
                {"day": 7, "enabled": True, "grants": [{"kind": "INVENTORY", "item_type": "DIAMOND", "amount": 1}]}
            ]
        }, admin_id=1)
        
        res = service.claim_streak_reward(user.id)
        assert res["success"] is True
        assert res["day"] == 3
        
        # 다시 수령 시도 -> 이미 수령함 (NO_CLAIMABLE_REWARD)
        res2 = service.claim_streak_reward(user.id)
        assert res2["success"] is False
        assert res2["message"] == "NO_CLAIMABLE_REWARD"

    def test_mission_requires_approval_flow(self, db_session):
        """승인이 필요한 미션은 APPROVED 상태가 되어야 보상 수령 가능"""
        user = _seed_user(db_session, user_id=7)
        _add_deposit(db_session, user.id, 1000)

        mission = Mission(
            title="검수 필요 미션",
            logic_key="APPROVAL_REQUIRED",
            action_type="ACTION",
            target_value=1,
            reward_type=MissionRewardType.POINT,
            reward_amount=1000,
            category=MissionCategory.SPECIAL,
            requires_approval=True,
            is_active=True
        )
        db_session.add(mission)
        db_session.commit()

        service = V2MissionService(db_session)
        service.update_progress(user.id, "ACTION", delta=1)

        # 1. 완료되었으나 승인 대기 중 (NONE 또는 PENDING) -> 수령 불가
        ok, msg, amt = service.claim_reward(user.id, mission.id)
        print(f"DEBUG: ok={ok}, msg={msg}, amt={amt}")
        assert ok is False
        assert msg == "APPROVAL_PENDING"

        # 2. 관리자가 승인 (APPROVED)
        progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == mission.id
        ).first()
        from app.models.mission import ApprovalStatus
        progress.approval_status = ApprovalStatus.APPROVED
        db_session.commit()

        # 3. 수령 시도 -> 성공
        ok, msg, amt = service.claim_reward(user.id, mission.id)
        assert ok is True, f"Expected True, got {ok} (msg={msg})"
        assert amt == 1000

    def test_new_user_mission_count_and_auto_claim(self, db_session):
        """신규 유저 미션의 카운트 누적 및 auto_claim 동작 확인"""
        user = _seed_user(db_session, user_id=101)
        # 입금 1회 완료 상태 (Strict Vault Policy 통과용)
        _add_deposit(db_session, user.id, 1000)
        
        # 3회 로그인이면 10 다이아몬드 (자동 수령)
        mission = Mission(
            title="3일간 로그인",
            logic_key="NEW_USER_LOGIN_3",
            action_type="LOGIN",
            target_value=3,
            reward_type=MissionRewardType.DIAMOND,
            reward_amount=10,
            category=MissionCategory.NEW_USER,
            auto_claim=True,
            is_active=True
        )
        db_session.add(mission)
        db_session.commit()
        
        service = V2MissionService(db_session)
        
        # 1일차 LOGIN
        service.update_progress(user.id, "LOGIN", delta=1)
        p1 = db_session.query(UserMissionProgress).filter(UserMissionProgress.mission_id == mission.id).first()
        assert p1.current_value == 1
        assert p1.is_claimed is False
        
        # 2일차 LOGIN
        service.update_progress(user.id, "LOGIN", delta=1)
        db_session.refresh(p1)
        assert p1.current_value == 2
        
        # 3일차 LOGIN -> 자동 수령 발생해야 함
        service.update_progress(user.id, "LOGIN", delta=1)
        db_session.refresh(p1)
        assert p1.current_value == 3
        assert p1.is_completed is True
        assert p1.is_claimed is True # auto_claim worked!

    def test_new_user_multiple_missions_overlap(self, db_session):
        """동일한 action_type에 대해 일반 미션과 신규 유저 미션이 동시에 카운트되는지 확인"""
        user = _seed_user(db_session, user_id=102)
        _add_deposit(db_session, user.id, 1000)

        # 1. 일반 데일리 미션: 1회 플레이
        m_daily = Mission(
            title="일일 1회", logic_key="DAILY_1", action_type="PLAY_GAME", target_value=1,
            reward_type=MissionRewardType.POINT, reward_amount=10, category=MissionCategory.DAILY, is_active=True
        )
        # 2. 신규 유저 전용: 1회 플레이 (특별 보상)
        m_new = Mission(
            title="신규 환영", logic_key="NEW_1", action_type="PLAY_GAME", target_value=1,
            reward_type=MissionRewardType.DIAMOND, reward_amount=1, category=MissionCategory.NEW_USER, is_active=True
        )
        db_session.add_all([m_daily, m_new])
        db_session.commit()
        
        service = V2MissionService(db_session)
        updated = service.update_progress(user.id, "PLAY_GAME", delta=1)
        
        # 두 미션 모두 업데이트되어야 함
        assert len(updated) == 2
        
        # 신규 유저가 아닌 경우 (10일 전 가입)
        user_old = _seed_user(db_session, user_id=103, created_at=datetime.utcnow() - timedelta(days=10))
        updated_old = service.update_progress(user_old.id, "PLAY_GAME", delta=1)
        
        # 데일리만 업데이트되어야 함
        assert len(updated_old) == 1
        assert updated_old[0].mission_id == m_daily.id

    def test_mission_reset_date_logic(self, db_session):
        """DAILY, WEEKLY 미션의 리셋 날짜 형식이 올바른지 확인"""
        # 2026-01-28 (수요일) 기준
        test_dt = datetime(2026, 1, 28, 11, 0, tzinfo=ZoneInfo("Asia/Seoul")) 
        
        class MockDateService(V2MissionService):
            def _now_tz(self):
                return test_dt
        
        service = MockDateService(db_session)
        
        # DAILY: YYYY-MM-DD
        daily_reset = service._get_reset_date_str(MissionCategory.DAILY)
        assert daily_reset == "2026-01-28"
        
        # WEEKLY: YYYY-WXX
        weekly_reset = service._get_reset_date_str(MissionCategory.WEEKLY)
        # 2026-W05
        assert weekly_reset == "2026-W05"

    def test_mission_service_missing_method_smoke_test(self, db_session):
        """V2MissionService 내에 호출은 되지만 정의되지 않은 메소드 유무 확인 (정적 검사 성격)"""
        service = V2MissionService(db_session)
        # claim_reward 내부에서 self.check_all_daily_completed(user_id)를 호출하고 있음
        # 현재 missing인 경우 AttributeError가 발생하여 try-except로 넘어감.
        # 명시적으로 존재하는지 확인 (TODO: 구현될 경우 이 테스트는 pass)
        has_method = hasattr(service, "check_all_daily_completed")
        assert has_method is True, "check_all_daily_completed 메소드가 정의되어 있지 않습니다."
