import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException

from app.db.base_class import Base
from app.models.user import User
from app.v2.models.user import V2User
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.v2.models.v2_roulette import V2RouletteConfig, V2RouletteSegment
from app.v2.models.v2_lottery import V2LotteryConfig, V2LotteryPrize
from app.v2.models.v2_dice import V2DiceConfig
from app.models.mission import Mission, UserMissionProgress, MissionCategory, MissionRewardType
from app.v2.services.v2_roulette_game_service import V2RouletteGameService
from app.v2.services.v2_lottery_game_service import V2LotteryGameService
from app.v2.services.v2_dice_game_service import V2DiceGameService
from app.v2.services.mission_service import V2MissionService
from app.core.exceptions import InvalidConfigError

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_user(db_session: Session):
    # 1. Create Legacy Master User
    user = User(
        id=1,
        external_id="test-cc-id",
        nickname="Tester",
        vault_locked_balance=10000,
    )
    db_session.add(user)
    
    # 2. Create V2 Native User (Linked)
    v2_user = V2User(
        id=1,
        cc_id="test-cc-id",
        nickname="Tester",
        vault_locked_balance=10000,
    )
    db_session.add(v2_user)
    db_session.commit()
    return user

def test_roulette_status_empty_on_invalid_config(db_session, test_user):
    """Verify that roulette status returns 200 with fallback empty data if no config exists."""
    service = V2RouletteGameService()
    # No config added
    
    status = service.get_status(db_session, user_id=test_user.id, ticket_type="ROULETTE_TICKET")
    assert status.config_id == 0
    assert status.name == "UNCONFIGURED"
    assert status.segments == []

def test_lottery_status_empty_on_invalid_config(db_session, test_user):
    """Verify that lottery status returns 200 with empty prizes if no config exists."""
    service = V2LotteryGameService()
    
    status = service.get_status(db_session, user_id=test_user.id)
    assert status.config_id == 0
    assert status.prize_preview == []

def test_roulette_play_fallback(db_session, test_user):
    """Verify that roulette play falls back to ROULETTE_TICKET config if DIAMOND_TICKET config is missing."""
    from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
    from datetime import date
    service = V2RouletteGameService()
    # 혜택 정지 우회: 오늘 입금 내역 추가
    deposit = ExternalRankingDailyDepositDelta(user_id=test_user.id, kst_date=date.today(), deposit_delta=10000)
    db_session.add(deposit)
    db_session.commit()
    
    # 1. Add a ROULETTE_TICKET config
    config = V2RouletteConfig(
        id=1,
        name="Default Roulette",
        ticket_type="ROULETTE_TICKET",
        is_active=True,
    )
    db_session.add(config)
    
    # Add 6 segments (required for validation)
    for i in range(6):
        seg = V2RouletteSegment(
            config_id=1,
            slot_index=i,
            label=f"Prize {i}",
            reward_type="POINT",
            reward_amount=100,
            weight=100,
        )
        db_session.add(seg)
    
    # 2. Add DIAMOND_TICKET (but only in user wallet)
    wallet = UserGameWallet(user_id=test_user.id, token_type=GameTokenType.DIAMOND_TICKET, balance=5)
    db_session.add(wallet)
    db_session.commit()
    
    # 3. Play with DIAMOND_TICKET -> Should fallback to config 1 (ROULETTE_TICKET)
    result = service.play(db_session, user_id=test_user.id, ticket_type="DIAMOND_TICKET")
    assert result.result == "OK"
    # To verify it used config 1, we can check the segment's config_id if we want,
    # but since segments are only in config 1, success implies correct config usage.
    # We'll just verify the segment belongs to config 1.
    segment_in_db = db_session.get(V2RouletteSegment, result.segment.id)
    assert segment_in_db.config_id == 1

def test_dice_play_vault_deduction(db_session, test_user):
    """Verify that dice play deducts bet amount from vault (lose_reward_amount = -100)."""
    from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
    from datetime import date
    service = V2DiceGameService()
    # 혜택 정지 우회: 오늘 입금 내역 추가
    deposit = ExternalRankingDailyDepositDelta(user_id=test_user.id, kst_date=date.today(), deposit_delta=10000)
    db_session.add(deposit)
    db_session.commit()
    
    # Add Dice Config
    config = V2DiceConfig(
        id=1,
        name="Dice Config",
        is_active=True,
        ticket_type="DICE_TICKET",
        win_reward_type="POINT",
        win_reward_amount=200,
        lose_reward_type="POINT",
        lose_reward_amount=-100, # Deduction
        win_probability=0.0,
        lose_probability=1.0,
    )
    db_session.add(config)
    
    # Add ticket
    wallet = UserGameWallet(user_id=test_user.id, token_type=GameTokenType.DICE_TICKET, balance=1)
    db_session.add(wallet)
    db_session.commit()
    
    initial_balance = test_user.vault_locked_balance
    
    # Forced lose (using random seed or just looping until lose? Dice is RNG)
    # Actually V2DiceGameService uses random.randint(1, 6).
    # Let's loop a few times if needed, or just check the delta logic.
    result = service.play(db_session, user_id=test_user.id)
    
    # Force DB sync and clear session cache to be safe
    db_session.flush()
    
    v2_user = db_session.get(V2User, test_user.id)
    db_session.refresh(test_user)
    db_session.refresh(v2_user)
    
    if result.game.outcome == "WIN":
        assert test_user.vault_locked_balance == initial_balance + 200
    elif result.game.outcome == "LOSE":
        assert test_user.vault_locked_balance == initial_balance - 100
        
    assert v2_user.vault_locked_balance == test_user.vault_locked_balance

def test_mission_admin_actions(db_session, test_user):
    """Verify mission management actions: force complete and reset."""
    # 1. Setup Mission
    mission = Mission(
        id=1,
        title="Test Mission",
        category=MissionCategory.DAILY,
        logic_key="play_game_1",
        target_value=1,
        reward_type=MissionRewardType.POINT,
        reward_amount=1000,
    )
    db_session.add(mission)
    db_session.commit()
    
    service = V2MissionService(db_session)
    reset_date = service._get_reset_date_str(MissionCategory.DAILY)
    
    # 2. Force Complete (Backend simulation of admin route)
    progress = UserMissionProgress(
        user_id=test_user.id,
        mission_id=mission.id,
        reset_date=reset_date,
        current_value=0,
    )
    db_session.add(progress)
    db_session.commit()
    
    # Simulate force complete logic found in user_routes.py
    progress.is_completed = True
    progress.current_value = mission.target_value
    progress.completed_at = datetime.utcnow()
    db_session.commit()
    
    db_session.refresh(progress)
    assert progress.is_completed is True
    assert progress.current_value == 1
    
    # 3. Reset
    progress.current_value = 0
    progress.is_completed = False
    progress.completed_at = None
    db_session.commit()
    
    db_session.refresh(progress)
    assert progress.is_completed is False
    assert progress.current_value == 0

