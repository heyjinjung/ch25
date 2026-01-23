import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base_class import Base
from app.models.mission import Mission, MissionCategory, MissionRewardType, UserMissionProgress
from app.models.user import User
from app.models.game_wallet import UserGameWallet, GameTokenType
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


def test_v2_mission_update_progress(db_session):
    user = _seed_user(db_session, user_id=1)

    mission = Mission(
        title="Play Game",
        description="Play twice",
        category=MissionCategory.DAILY,
        logic_key="PLAY_GAME_2",
        action_type="PLAY_GAME",
        target_value=2,
        reward_type=MissionRewardType.POINT,
        reward_amount=100,
        is_active=True,
    )
    db_session.add(mission)
    db_session.commit()

    service = V2MissionService(db_session)
    updated = service.update_progress(user.id, "PLAY_GAME", delta=1)
    assert len(updated) == 1

    updated = service.update_progress(user.id, "PLAY_GAME", delta=1)
    progress = db_session.query(UserMissionProgress).filter(
        UserMissionProgress.user_id == user.id,
        UserMissionProgress.mission_id == mission.id,
    ).first()
    assert progress is not None
    assert progress.current_value == 2
    assert progress.is_completed is True


def test_v2_mission_claim_reward_vault(db_session):
    user = _seed_user(db_session, user_id=2)

    mission = Mission(
        title="Daily Vault",
        description="Claim vault",
        category=MissionCategory.DAILY,
        logic_key="DAILY_VAULT",
        action_type="LOGIN",
        target_value=1,
        reward_type=MissionRewardType.POINT,
        reward_amount=100,
        is_active=True,
    )
    db_session.add(mission)
    db_session.commit()

    service = V2MissionService(db_session)
    reset_date = service._get_reset_date_str(mission.category)
    progress = UserMissionProgress(
        user_id=user.id,
        mission_id=mission.id,
        reset_date=reset_date,
        current_value=1,
        is_completed=True,
        is_claimed=False,
    )
    db_session.add(progress)
    db_session.commit()

    ok, reward_type, amount = service.claim_reward(user.id, mission.id)
    assert ok is True
    assert amount == 100

    db_session.refresh(user)
    assert int(user.vault_locked_balance or 0) >= 100


def test_v2_mission_claim_daily_gift(db_session):
    user = _seed_user(db_session, user_id=3)

    mission = Mission(
        title="Daily Gift",
        description="Gift",
        category=MissionCategory.DAILY,
        logic_key="daily_login_gift",
        action_type="LOGIN",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=1,
        is_active=True,
    )
    db_session.add(mission)
    db_session.commit()

    service = V2MissionService(db_session)
    ok, reward_type, amount = service.claim_daily_gift(user.id)
    assert ok is True
    assert amount == 1

    wallet = db_session.query(UserGameWallet).filter(
        UserGameWallet.user_id == user.id,
        UserGameWallet.token_type == GameTokenType.DIAMOND,
    ).first()
    assert wallet is not None
    assert wallet.balance >= 1
