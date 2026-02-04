import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.db.base_class import Base
from app.models.user import User
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.inventory import UserInventoryItem
from app.v2.models.v2_level_reward import V2LevelRewardTable
from app.models.level_xp import UserLevelProgress
from app.services.reward_service import RewardService
from app.services.level_xp_service import LevelXPService
from app.services.shop_service import ShopService, ShopProduct

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine("sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_user(db_session: Session):
    user = User(id=1, external_id="tester", nickname="Tester")
    db_session.add(user)
    db_session.commit()
    return user

def test_diamond_migration_reward(db_session, test_user):
    """DIAMOND reward should go to GameWallet, not Inventory."""
    reward_service = RewardService()
    reward_service.deliver(db_session, user_id=test_user.id, reward_type="DIAMOND", reward_amount=100)
    
    # Check Wallet
    wallet = db_session.query(UserGameWallet).filter(
        UserGameWallet.user_id == test_user.id,
        UserGameWallet.token_type == GameTokenType.DIAMOND
    ).first()
    assert wallet is not None
    assert wallet.balance == 100
    
    # Check Inventory (Should be empty for DIAMOND)
    inv_item = db_session.query(UserInventoryItem).filter(
        UserInventoryItem.user_id == test_user.id,
        UserInventoryItem.item_type == "DIAMOND"
    ).first()
    assert inv_item is None

def test_diamond_migration_shop_consume(db_session, test_user):
    """Shop purchase with DIAMOND cost should consume from Wallet."""
    # Seed DIAMOND wallet
    wallet = UserGameWallet(user_id=test_user.id, token_type=GameTokenType.DIAMOND, balance=500)
    db_session.add(wallet)
    db_session.commit()
    
    # Mock Shop purchase
    from app.services.shop_service import SHOP_PRODUCTS
    # Use a product that costs DIAMOND, e.g., PROD_GOLD_KEY_1 (costs 30 DIAMOND)
    sku = "PROD_GOLD_KEY_1"
    
    # Make sure vault policy doesn't block (simplest is to ensure user has first_deposit)
    test_user.first_deposit_at = datetime.utcnow()
    db_session.add(test_user)
    db_session.commit()
    
    shop_service = ShopService()
    shop_service.purchase_product(db_session, user_id=test_user.id, sku=sku)
    
    # Verify Wallet deduction
    db_session.refresh(wallet)
    assert wallet.balance == 470 # 500 - 30

def test_dynamic_level_xp_logic(db_session, test_user):
    """Level up should follow V2LevelRewardTable values.
    
    최신 SoT: v2_user.level, v2_user.xp가 Primary Source
    LevelXPService는 v2_user를 업데이트하고 user_level_progress를 동기화함
    """
    from app.v2.models.user import V2User
    
    # Seed custom level requirements
    db_session.add(V2LevelRewardTable(level=1, required_xp=0, reward_type="NONE", reward_amount=0))
    db_session.add(V2LevelRewardTable(level=2, required_xp=77, reward_type="NONE", reward_amount=0)) # Custom threshold
    db_session.commit()
    
    # V2User 초기화 (Primary SoT)
    v2_user = db_session.get(V2User, test_user.id)
    if not v2_user:
        v2_user = V2User(
            user_id=test_user.id,
            external_id=test_user.external_id,
            nickname=test_user.nickname,
            level=1,
            xp=0
        )
        db_session.add(v2_user)
        db_session.commit()
    
    xp_service = LevelXPService()
    
    # 1. Gain enough XP for Lv 1 but not Lv 2
    xp_service.add_xp(db_session, user_id=test_user.id, delta=50, source="TEST")
    db_session.refresh(v2_user)
    assert v2_user.level == 1
    assert v2_user.xp == 50
    
    # 2. Gain remaining XP for Lv 2 (77 required, already have 50)
    xp_service.add_xp(db_session, user_id=test_user.id, delta=27, source="TEST")
    db_session.refresh(v2_user)
    assert v2_user.level == 2
    assert v2_user.xp == 77
