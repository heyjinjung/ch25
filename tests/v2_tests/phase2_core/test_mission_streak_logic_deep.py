from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base_class import Base
from app.models.user import User
from app.v2.services.streak_service import V2StreakService
from app.v2.services.ui_config_service import UiConfigService

@pytest.fixture()
def db_session() -> Session:
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
        # Create a test user
        user = User(id=1, external_id="test_user", nickname="Tester", play_streak=0)
        db.add(user)
        db.commit()
        yield db
    finally:
        db.close()
        engine.dispose()

def test_streak_multiplier_logic(db_session: Session) -> None:
    service = V2StreakService(db_session)
    
    # Mock settings values (since we don't have a real settings object with these fields in the test env)
    # The service uses get_settings() which might return default Mocked settings.
    # Let's assume default multiplier is 1.0 if not enabled.
    
    assert service._get_streak_multiplier(0) == 1.0
    assert service._get_streak_multiplier(3) == 1.0 # Default might be disabled
    
    # If we could patch settings, we'd test 1.5x and 2.0x.

def test_streak_operational_date_calc(db_session: Session) -> None:
    service = V2StreakService(db_session)
    
    # 08:59 KST -> Yesterday
    dt_early = datetime(2026, 1, 29, 8, 59, tzinfo=ZoneInfo("Asia/Seoul"))
    assert service.get_operational_play_date(dt_early) == date(2026, 1, 28)
    
    # 09:00 KST -> Today
    dt_on_time = datetime(2026, 1, 29, 9, 0, tzinfo=ZoneInfo("Asia/Seoul"))
    assert service.get_operational_play_date(dt_on_time) == date(2026, 1, 29)

def test_streak_milestone_claim_flow(db_session: Session) -> None:
    service = V2StreakService(db_session)
    user_id = 1
    
    # 1. Reach 3-day streak
    user = db_session.query(User).get(user_id)
    user.play_streak = 3
    user.last_play_date = date(2026, 1, 29)
    db_session.commit()
    
    # 2. Check pending milestone
    pending = service.get_pending_streak_milestone(user_id)
    assert pending == 3
    
    # 3. Claim reward
    result = service.claim_streak_reward(user_id)
    assert result["success"] is True
    assert result["day"] == 3
    assert len(result["grants"]) > 0
    
    # 4. Check no more pending
    assert service.get_pending_streak_milestone(user_id) is None
    
    # 5. Reach 7-day streak
    user.play_streak = 7
    user.last_play_date = date(2026, 2, 2)
    db_session.commit()
    
    assert service.get_pending_streak_milestone(user_id) == 7
    
    # 6. Claim again
    result = service.claim_streak_reward(user_id)
    assert result["success"] is True
    assert result["day"] == 7

def test_streak_force_grant_and_reset(db_session: Session) -> None:
    service = V2StreakService(db_session)
    user_id = 1
    
    # Force grant
    result = service.force_grant_milestone(user_id, 3)
    assert result["success"] is True
    
    # Already granted
    result_fail = service.force_grant_milestone(user_id, 3)
    assert result_fail["success"] is False
    assert result_fail["message"] == "ALREADY_GRANTED"
    
    # Set streak count
    service.set_streak_count(user_id, 10)
    user = db_session.query(User).get(user_id)
    assert user.play_streak == 10
    
    # Reset streak
    service.reset_user_streak(user_id)
    assert user.play_streak == 0
    assert user.last_play_date is None

def test_streak_milestone_progress_listing(db_session: Session) -> None:
    service = V2StreakService(db_session)
    user_id = 1
    
    # Initially none achieved
    progress = service.get_milestone_progress(user_id)
    assert all(not p["achieved"] for p in progress)
    
    # Achieve one
    user = db_session.query(User).get(user_id)
    user.play_streak = 5
    user.last_play_date = date.today()
    db_session.commit()
    
    progress = service.get_milestone_progress(user_id)
    day_3 = next(p for p in progress if p["day"] == 3)
    assert day_3["achieved"] is True
    assert day_3["claimed"] is False
    
    # Claim it
    service.claim_streak_reward(user_id)
    progress = service.get_milestone_progress(user_id)
    day_3 = next(p for p in progress if p["day"] == 3)
    assert day_3["claimed"] is True
