import pytest
import json
from datetime import datetime, date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

# Models
from app.db.base_class import Base
from app.models.user import User
from app.models.app_ui_config import AppUiConfig
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.models.inventory import UserInventoryItem
from app.v2.models.v2_shop_order import V2ShopOrder
from app.models.idempotency import UserIdempotencyKey
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta

# Services & Routes
from app.services.ui_config_service import UiConfigService
from app.v2.api.routes import list_shop_products, purchase_shop_product, V2ShopPurchaseRequest

from unittest.mock import patch, MagicMock

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    # Initialize some required data
    db.execute(AppUiConfig.__table__.insert(), [{"key": "v2_shop_products", "value_json": {"products": [
        {
            "sku": "TICKET_ROULETTE_1",
            "name": "Roulette Ticket x1",
            "cost_amount": 1000,
            "reward_type": "ROULETTE_TICKET",
            "reward_amount": 1
        }
    ]}}])
    db.commit()
    try:
        yield db
    finally:
        db.close()

from app.v2.models.user import V2User

def setup_user(db, user_id=1, locked=5000):
    # Legacy/Core User
    user = User(
        id=user_id,
        external_id=f"ext_{user_id}",
        nickname=f"user_{user_id}",
        vault_locked_balance=locked
    )
    db.add(user)
    
    # V2-specific User table (if exists separately in scaffold)
    v2_user = V2User(
        id=user_id,
        cc_id=f"ext_{user_id}",
        nickname=f"user_{user_id}",
        vault_locked_balance=locked
    )
    db.add(v2_user)
    
    # Add deposit record to satisfy Strict Vault Policy (7-day no-deposit check)
    deposit = ExternalRankingDailyDepositDelta(
        user_id=user_id,
        kst_date=date.today(),
        deposit_delta=locked if locked > 0 else 1000 # ensure at least some deposit
    )
    db.add(deposit)
    
    db.commit()
    return user

def test_shop_purchase_integrity(db_session):
    """
    Phase 2-7: Shop Purchase Integrity.
    Verify that purchasing a product correctly deducts from Vault and grants rewards.
    """
    user = setup_user(db_session, user_id=1, locked=10000)
    
    # Payload for Roulette Ticket (Cost 1000)
    payload = V2ShopPurchaseRequest(sku="TICKET_ROULETTE_1")
    
    # Act
    res = purchase_shop_product(
        payload=payload,
        db=db_session,
        user_id=1,
        x_idempotency_key=None,
        idempotency_key="TEST_PURCHASE_1"
    )
    
    # Verify
    assert res["sku"] == "TICKET_ROULETTE_1"
    assert res["reward_amount"] == 1
    
    # Check legacy User (SoT) + V2User mirror
    v2_user = db_session.get(V2User, 1)
    db_session.refresh(user)
    assert user.vault_locked_balance == 9000
    assert v2_user.vault_locked_balance == 9000

    # Check daily spend tracking (operational day 기준)
    assert int(getattr(user, "vault_spent_today", 0) or 0) == 1000
    
    # Check Wallet (V2 token)
    wallet = db_session.query(UserGameWallet).filter_by(user_id=1, token_type=GameTokenType.ROULETTE_TICKET).first()
    assert wallet is not None
    assert wallet.balance == 1

    # Check V2 Shop Order Log
    order = db_session.query(V2ShopOrder).filter_by(user_id=1, sku="TICKET_ROULETTE_1").first()
    assert order is not None
    assert order.cost_type == "VAULT"

def test_shop_purchase_idempotency(db_session):
    """
    Phase 2-7: Shop Purchase Idempotency.
    Verify that multiple requests with the same key do not result in double charging.
    """
    user = setup_user(db_session, user_id=2, locked=10000)
    v2_user = db_session.get(V2User, 2)
    payload = V2ShopPurchaseRequest(sku="TICKET_ROULETTE_1")
    
    # First call
    res1 = purchase_shop_product(
        payload=payload, 
        db=db_session, 
        user_id=2, 
        x_idempotency_key=None,
        idempotency_key="IDEM_KEY_1"
    )
    db_session.refresh(v2_user)
    db_session.refresh(user)
    assert user.vault_locked_balance == 9000
    assert v2_user.vault_locked_balance == 9000
    
    # Second call (same key)
    res2 = purchase_shop_product(
        payload=payload, 
        db=db_session, 
        user_id=2, 
        x_idempotency_key=None,
        idempotency_key="IDEM_KEY_1"
    )
    assert res1 == res2
    
    db_session.refresh(v2_user)
    db_session.refresh(user)
    assert user.vault_locked_balance == 9000
    assert v2_user.vault_locked_balance == 9000 # Still 9000

def test_shop_cache_invalidation_simulation(db_session):
    """
    Phase 2-7: Shop Cache Invalidation.
    Verify that updating UiConfig immediately reflects in the product list (no server-side stale cache).
    """
    # 1. Initial Check
    products = list_shop_products(db=db_session, user_id=1)
    assert len(products) == 1
    assert products[0]["sku"] == "TICKET_ROULETTE_1"
    
    # 2. Update UiConfig
    new_products = {
        "products": [
            {
                "sku": "TICKET_ROULETTE_1",
                "name": "Roulette Ticket x1",
                "cost_amount": 1000,
                "reward_type": "ROULETTE_TICKET",
                "reward_amount": 1
            },
            {
                "sku": "TICKET_DICE_2",
                "name": "Dice Ticket x2",
                "cost_amount": 2000,
                "reward_type": "DICE_TICKET",
                "reward_amount": 2
            }
        ]
    }
    UiConfigService.upsert(db_session, "v2_shop_products", new_products)
    
    # 3. Final Check: Should have 2 products immediately
    products_after = list_shop_products(db=db_session, user_id=1)
    assert len(products_after) == 2
    assert any(p["sku"] == "TICKET_DICE_2" for p in products_after)
