import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base_class import Base
from app.models.mission import Mission, MissionCategory, MissionRewardType, UserMissionProgress
from app.models.user import User
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.models.inventory import UserInventoryItem
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
    user = User(id=user_id, external_id=f"ext_{user_id}", nickname=f"user_{user_id}", vault_locked_balance=0)
    db.add(user)
    db.commit()
    return user

def _create_and_claim_mission(db, user_id, reward_type, reward_amount=1):
    # 1. Create Mission
    mission = Mission(
        title="Test Mission",
        description="Test",
        category=MissionCategory.DAILY,
        logic_key=f"logic_{reward_type}",
        action_type="TEST",
        target_value=1,
        reward_type=reward_type,
        reward_amount=reward_amount,
        is_active=True,
    )
    db.add(mission)
    db.commit()

    # 2. Seed Progress (Completed)
    service = V2MissionService(db)
    reset_date = service._get_reset_date_str(mission.category)
    progress = UserMissionProgress(
        user_id=user_id,
        mission_id=mission.id,
        reset_date=reset_date,
        current_value=1,
        is_completed=True,
        is_claimed=False,
    )
    db.add(progress)
    db.commit()

    # 3. Claim
    ok, r_type, amount = service.claim_reward(user_id, mission.id)
    return ok, r_type, amount

def test_accumulate_vault_point(db_session):
    """Verify POINT reward updates Vault balance."""
    user = _seed_user(db_session, 101)
    
    ok, _, amount = _create_and_claim_mission(db_session, user.id, MissionRewardType.POINT, 500)
    
    assert ok is True
    assert amount == 500
    
    db_session.refresh(user)
    print(f"Vault Balance: {user.vault_locked_balance}")
    assert user.vault_locked_balance == 500

def test_accumulate_wallet_ticket(db_session):
    """Verify TICKET_ROULETTE reward updates UserGameWallet."""
    user = _seed_user(db_session, 102)
    
    # MissionRewardType.TICKET_ROULETTE -> Mapped to GameTokenType.ROULETTE_TICKET/COIN internally
    ok, _, amount = _create_and_claim_mission(db_session, user.id, MissionRewardType.TICKET_ROULETTE, 3)
    
    assert ok is True
    assert amount == 3
    
    wallet = db_session.query(UserGameWallet).filter(
        UserGameWallet.user_id == user.id,
    ).all()
    
    print(f"DEBUG: All Wallet Items: {[(w.token_type, w.balance) for w in wallet]}")

    # Check for V2 Standard Name using Enum comparison
    roulette_wallet = next((w for w in wallet if w.token_type == GameTokenType.ROULETTE_TICKET), None)
    
    # Fallback to legacy if needed
    if not roulette_wallet:
         roulette_wallet = next((w for w in wallet if str(w.token_type) == "ROULETTE_COIN"), None)
    
    assert roulette_wallet is not None, f"ROULETTE_TICKET not found. Wallet content: {[(w.token_type, w.balance) for w in wallet]}"
    print(f"Wallet Token: {roulette_wallet.token_type}, Balance: {roulette_wallet.balance}")
    assert roulette_wallet.balance == 3

def test_accumulate_inventory_gifticon(db_session):
    """Verify CHICKEN_GIFTICON_5000 reward updates UserInventoryItem."""
    user = _seed_user(db_session, 103)
    
    # Use specific item type that doesn't require value validation, or use correct value
    reward_type_enum = MissionRewardType.CHICKEN_GIFTICON_5000
    print(f"DEBUG: Enum Value: {reward_type_enum}, Type: {type(reward_type_enum)}")
    
    ok, r_type, amount = _create_and_claim_mission(db_session, user.id, reward_type_enum, 1)
    print(f"DEBUG: Claim Result - OK: {ok}, Type: {r_type}, Amount: {amount}")
    
    assert ok is True
    assert amount == 1
    
    item = db_session.query(UserInventoryItem).filter(
        UserInventoryItem.user_id == user.id,
        UserInventoryItem.item_type == "CHICKEN_GIFTICON_5000"
    ).first()
    
    if item is None:
        all_items = db_session.query(UserInventoryItem).filter(UserInventoryItem.user_id == user.id).all()
        print(f"DEBUG: All items for user: {[i.item_type for i in all_items]}")

    assert item is not None
    print(f"Inventory Item: {item.item_type}, Quantity: {item.quantity}")
    assert item.quantity == 1

def test_accumulate_generic_mission_progress(db_session):
    """Verify generic mission (Play 10 times) progress accumulation."""
    user = _seed_user(db_session, 104)
    service = V2MissionService(db_session)
    
    # 1. Create Mission: Play Game 10 times
    mission = Mission(
        title="Play 10 Times",
        description="Generic",
        category=MissionCategory.DAILY,
        logic_key="daily_play_10",
        action_type="PLAY_GAME",
        target_value=10,
        reward_type=MissionRewardType.POINT,
        reward_amount=100,
        is_active=True,
    )
    db_session.add(mission)
    db_session.commit()
    
    # 2. Simulate 5 plays
    for _ in range(5):
        updated = service.update_progress(user.id, "PLAY_GAME", 1)
        assert len(updated) > 0
        
    progress = db_session.query(UserMissionProgress).filter(
        UserMissionProgress.user_id == user.id,
        UserMissionProgress.mission_id == mission.id
    ).first()
    
    assert progress.current_value == 5
    assert progress.is_completed is False
    
    # 3. Simulate 5 more plays
    for _ in range(5):
        service.update_progress(user.id, "PLAY_GAME", 1)
        
    db_session.refresh(progress)
    assert progress.current_value == 10
    assert progress.is_completed is True
    
    # 4. Claim
    ok, r_type, amount = service.claim_reward(user.id, mission.id)
    assert ok is True
    assert amount == 100
    
    db_session.refresh(user)
    assert user.vault_locked_balance == 100
