"""
Test V2 Mission System - Game-Specific Action Types
목표: PLAY_DICE, PLAY_ROULETTE, PLAY_LOTTERY 각각의 개별 미션 진행 테스트
"""
import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base_class import Base
from app.models.mission import Mission, MissionCategory, MissionRewardType, UserMissionProgress
from app.models.user import User
from app.v2.services.mission_service import V2MissionService


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


def _seed_user(db, user_id=1):
    user = User(id=user_id, external_id=f"ext_{user_id}", nickname=f"user_{user_id}")
    db.add(user)
    db.commit()
    return user


class TestGameSpecificMissions:
    """게임별 개별 미션 테스트"""

    def test_play_dice_mission_updates_only_dice(self, db_session):
        """PLAY_DICE는 dice 미션만 업데이트 (roulette/lottery X)"""
        user = _seed_user(db_session, user_id=100)

        # 3개 게임별 미션 생성
        dice_mission = Mission(
            title="일일 주사위 3회",
            description="주사위 3회 플레이",
            category=MissionCategory.DAILY,
            logic_key="DAILY_DICE_3",
            action_type="PLAY_DICE",
            target_value=3,
            reward_type=MissionRewardType.POINT,
            reward_amount=100,
            is_active=True,
        )
        roulette_mission = Mission(
            title="일일 룰렛 3회",
            description="룰렛 3회 플레이",
            category=MissionCategory.DAILY,
            logic_key="DAILY_ROULETTE_3",
            action_type="PLAY_ROULETTE",
            target_value=3,
            reward_type=MissionRewardType.POINT,
            reward_amount=100,
            is_active=True,
        )
        lottery_mission = Mission(
            title="일일 복권 3회",
            description="복권 3회 플레이",
            category=MissionCategory.DAILY,
            logic_key="DAILY_LOTTERY_3",
            action_type="PLAY_LOTTERY",
            target_value=3,
            reward_type=MissionRewardType.POINT,
            reward_amount=100,
            is_active=True,
        )
        db_session.add_all([dice_mission, roulette_mission, lottery_mission])
        db_session.commit()

        service = V2MissionService(db_session)

        # PLAY_DICE 호출 → dice_mission만 진행
        updated = service.update_progress(user.id, "PLAY_DICE", delta=1)
        assert len(updated) == 1
        assert any(u.mission_id == dice_mission.id for u in updated)

        # dice 진행 확인
        dice_progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == dice_mission.id,
        ).first()
        assert dice_progress is not None
        assert dice_progress.current_value == 1

        # roulette/lottery는 진행 없음
        roulette_progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == roulette_mission.id,
        ).first()
        lottery_progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == lottery_mission.id,
        ).first()
        assert roulette_progress is None or roulette_progress.current_value == 0
        assert lottery_progress is None or lottery_progress.current_value == 0

    def test_play_game_updates_all_game_missions(self, db_session):
        """PLAY_GAME은 PLAY_GAME 타입 미션만 업데이트 (PLAY_DICE/ROULETTE/LOTTERY는 별도)"""
        user = _seed_user(db_session, user_id=101)

        # PLAY_GAME 타입 미션과 PLAY_DICE 타입 미션
        generic_mission = Mission(
            title="일일 게임 5회",
            description="게임 5회 플레이",
            category=MissionCategory.DAILY,
            logic_key="DAILY_GAME_5",
            action_type="PLAY_GAME",
            target_value=5,
            reward_type=MissionRewardType.POINT,
            reward_amount=100,
            is_active=True,
        )
        dice_mission = Mission(
            title="일일 주사위 3회",
            description="주사위 3회 플레이",
            category=MissionCategory.DAILY,
            logic_key="DAILY_DICE_3",
            action_type="PLAY_DICE",
            target_value=3,
            reward_type=MissionRewardType.POINT,
            reward_amount=100,
            is_active=True,
        )
        db_session.add_all([generic_mission, dice_mission])
        db_session.commit()

        service = V2MissionService(db_session)

        # PLAY_GAME 호출 → generic_mission만 진행
        updated = service.update_progress(user.id, "PLAY_GAME", delta=1)
        assert len(updated) == 1
        assert any(u.mission_id == generic_mission.id for u in updated)

        # dice_mission은 PLAY_GAME으로 진행 안됨
        dice_progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == dice_mission.id,
        ).first()
        assert dice_progress is None or dice_progress.current_value == 0

    def test_dice_play_alias_matches_play_dice(self, db_session):
        """DICE_PLAY alias → PLAY_DICE 미션 매칭"""
        user = _seed_user(db_session, user_id=102)

        dice_mission = Mission(
            title="일일 주사위 2회",
            description="주사위 2회 플레이",
            category=MissionCategory.DAILY,
            logic_key="DAILY_DICE_2",
            action_type="PLAY_DICE",
            target_value=2,
            reward_type=MissionRewardType.POINT,
            reward_amount=50,
            is_active=True,
        )
        db_session.add(dice_mission)
        db_session.commit()

        service = V2MissionService(db_session)

        # DICE_PLAY (alias) 호출 → PLAY_DICE 미션 진행
        updated = service.update_progress(user.id, "DICE_PLAY", delta=1)
        assert len(updated) == 1

        progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == dice_mission.id,
        ).first()
        assert progress is not None
        assert progress.current_value == 1

    def test_combined_game_and_specific_missions(self, db_session):
        """주사위 플레이 시 PLAY_GAME + PLAY_DICE 둘 다 호출하면 각각 해당 미션만 진행"""
        user = _seed_user(db_session, user_id=103)

        generic_mission = Mission(
            title="일일 게임 10회",
            description="게임 10회 플레이",
            category=MissionCategory.DAILY,
            logic_key="DAILY_GAME_10",
            action_type="PLAY_GAME",
            target_value=10,
            reward_type=MissionRewardType.POINT,
            reward_amount=200,
            is_active=True,
        )
        dice_mission = Mission(
            title="일일 주사위 5회",
            description="주사위 5회 플레이",
            category=MissionCategory.DAILY,
            logic_key="DAILY_DICE_5",
            action_type="PLAY_DICE",
            target_value=5,
            reward_type=MissionRewardType.POINT,
            reward_amount=100,
            is_active=True,
        )
        db_session.add_all([generic_mission, dice_mission])
        db_session.commit()

        service = V2MissionService(db_session)

        # 주사위 플레이 시뮬레이션: PLAY_GAME + PLAY_DICE 둘 다 호출
        service.update_progress(user.id, "PLAY_GAME", delta=1)
        service.update_progress(user.id, "PLAY_DICE", delta=1)

        # 둘 다 각각 1씩 진행됨
        generic_progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == generic_mission.id,
        ).first()
        dice_progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == dice_mission.id,
        ).first()

        assert generic_progress is not None
        assert generic_progress.current_value == 1
        assert dice_progress is not None
        assert dice_progress.current_value == 1


class TestNewUserMissions:
    """신규 유저 미션 테스트"""

    def test_telegram_join_mission(self, db_session):
        """JOIN_TELEGRAM_CHANNEL 미션 진행"""
        user = _seed_user(db_session, user_id=200)

        tg_mission = Mission(
            title="텔레그램 채널 입장",
            description="공식 텔레그램 채널 입장",
            category=MissionCategory.NEW_USER,
            logic_key="NEW_USER_TG_JOIN",
            action_type="JOIN_TELEGRAM_CHANNEL",
            target_value=1,
            reward_type=MissionRewardType.POINT,
            reward_amount=50,
            is_active=True,
        )
        db_session.add(tg_mission)
        db_session.commit()

        service = V2MissionService(db_session)
        updated = service.update_progress(user.id, "JOIN_TELEGRAM_CHANNEL", delta=1)

        assert len(updated) == 1
        progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == tg_mission.id,
        ).first()
        assert progress is not None
        assert progress.is_completed is True

    def test_cc_deposit_mission(self, db_session):
        """CC_DEPOSIT 미션 진행"""
        user = _seed_user(db_session, user_id=201)

        deposit_mission = Mission(
            title="일일 CC 입금",
            description="CC 입금 1회",
            category=MissionCategory.DAILY,
            logic_key="DAILY_CC_DEPOSIT_1",
            action_type="CC_DEPOSIT",
            target_value=1,
            reward_type=MissionRewardType.POINT,
            reward_amount=100,
            is_active=True,
        )
        db_session.add(deposit_mission)
        db_session.commit()

        service = V2MissionService(db_session)
        updated = service.update_progress(user.id, "CC_DEPOSIT", delta=1)

        assert len(updated) == 1
        progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == deposit_mission.id,
        ).first()
        assert progress is not None
        assert progress.is_completed is True


class TestWeeklyMissions:
    """주간 미션 테스트"""

    def test_weekly_roulette_mission(self, db_session):
        """주간 룰렛 미션"""
        user = _seed_user(db_session, user_id=300)

        weekly_roulette = Mission(
            title="주간 룰렛 10회",
            description="룰렛 10회 플레이",
            category=MissionCategory.WEEKLY,
            logic_key="WEEKLY_ROULETTE_10",
            action_type="PLAY_ROULETTE",
            target_value=10,
            reward_type=MissionRewardType.POINT,
            reward_amount=500,
            is_active=True,
        )
        db_session.add(weekly_roulette)
        db_session.commit()

        service = V2MissionService(db_session)

        # 5회 플레이
        for _ in range(5):
            service.update_progress(user.id, "PLAY_ROULETTE", delta=1)

        progress = db_session.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user.id,
            UserMissionProgress.mission_id == weekly_roulette.id,
        ).first()
        assert progress is not None
        assert progress.current_value == 5
        assert progress.is_completed is False

        # 5회 더 플레이 → 완료
        for _ in range(5):
            service.update_progress(user.id, "PLAY_ROULETTE", delta=1)

        db_session.refresh(progress)
        assert progress.current_value == 10
        assert progress.is_completed is True
