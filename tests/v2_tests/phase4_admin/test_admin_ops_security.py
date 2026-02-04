import pytest
from datetime import datetime, date, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base_class import Base
from app.models.user import User
from app.v2.models.user import V2User
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.models.inventory import UserInventoryItem
from app.models.app_ui_config import AppUiConfig # Ensure this is in metadata
from app.models.admin_audit_log import AdminAuditLog
from app.models.user_segment import UserSegment
from app.models.season_pass import SeasonPassConfig, SeasonPassProgress
from app.models.level_xp import UserLevelProgress

from app.services.admin_user_service import AdminUserService
from app.v2.services.vault_service import V2VaultService
from app.services.vault_service import VaultService
from app.services.inventory_service import InventoryService
from app.services.ui_config_service import UiConfigService
from unittest.mock import MagicMock, patch

# --- DB SETUP ---

@pytest.fixture(scope="function")
def db_session():
    # Use SQLite in-memory
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def setup_user(db_session):
    """Create a mock user in both User and V2User tables."""
    # Create legacy User
    user = User(
        id=100,
        external_id="b3b0a701-447a-4b9e-8c5e-8b6b6c6b6c6b",
        nickname="AdminTester",
        level=1,
        xp=0,
        vault_locked_balance=5000,
        vault_spent_today=1000,
        vault_spent_reset_date="2026-01-19"
    )
    db_session.add(user)
    db_session.flush()
    
    # Create V2User (mirrored) with level/xp initialized
    v2_user = V2User(
        id=user.id,
        cc_id=user.external_id,
        nickname=user.nickname,
        vault_locked_balance=user.vault_locked_balance,
        level=1,  # V2 SoT: Primary level
        xp=0  # V2 SoT: Primary xp
    )
    db_session.add(v2_user)
    db_session.commit()
    db_session.refresh(user)
    return user

# --- TESTS ---

def test_admin_level_xp_adjustment(db_session, setup_user):
    """4-3. Admin User Management: Manual Level/XP Adjustment.
    
    최신 SoT: v2_user.level, v2_user.xp가 Primary Source
    레거시 user_level_progress는 동기화됨
    """
    from app.schemas.admin_user import AdminUserUpdate
    from app.models.season_pass import SeasonPassConfig
    user = setup_user
    payload = AdminUserUpdate(level=5, xp=1500)
    
    # Create a mock active season
    season = SeasonPassConfig(
        id=1,
        season_name="SEASON-" + "b3b0a701-447a-4b9e-8c5e-8b6b6c6b6c6b",
        start_date=(datetime.utcnow() - timedelta(days=1)).date(),
        end_date=(datetime.utcnow() + timedelta(days=1)).date(),
        max_level=100,
        base_xp_per_stamp=10,
        is_active=True
    )
    db_session.add(season)
    db_session.commit()
    
    # Execute update
    updated_user = AdminUserService.update_user(db_session, user.id, payload)
    
    # V2 SoT: v2_user.level, v2_user.xp가 Primary
    assert updated_user.xp == 1500
    
    # V2User 확인 (Primary SoT)
    v2_user = db_session.get(V2User, user.id)
    assert v2_user is not None
    assert v2_user.xp == 1500
    assert v2_user.level == 5
    
    # 레거시 user_level_progress도 동기화 확인
    progress = db_session.get(UserLevelProgress, user.id)
    if progress:
        assert progress.xp == 1500
        assert progress.level == 5

def test_admin_wallet_adjustment_vault(db_session, setup_user):
    """4-3. Admin User Management: Wallet Adjustment."""
    user = setup_user
    initial_balance = user.vault_locked_balance
    
    # Simulate V2 route logic: V2VaultService.deposit/withdraw
    V2VaultService.deposit(db_session, user.id, 10000)
    db_session.commit()

    db_user = db_session.get(User, user.id)
    assert db_user.vault_locked_balance == initial_balance + 10000

    V2VaultService.withdraw(db_session, user.id, 5000)
    db_session.commit()

    db_user = db_session.get(User, user.id)
    assert db_user.vault_locked_balance == initial_balance + 5000

def test_admin_inventory_adjustment(db_session, setup_user):
    """4-6. Admin Resource Management: Inventory Adjustment."""
    user = setup_user
    item_type = "TICKET_ROULETTE"
    
    # Grant
    InventoryService.grant_item(db_session, user_id=user.id, item_type=item_type, amount=10, reason="ADMIN_TEST")
    db_session.commit()
    
    item = db_session.query(UserInventoryItem).filter_by(user_id=user.id, item_type=item_type).first()
    assert item.quantity == 10
    
    # Consume
    InventoryService.consume_item(db_session, user_id=user.id, item_type=item_type, amount=3, reason="ADMIN_TEST")
    db_session.commit()
    
    db_session.refresh(item)
    assert item.quantity == 7

def test_intervention_bailout(db_session, setup_user):
    """4-4. Admin Messaging & Targeting: Intervention execution."""
    user = setup_user
    initial_balance = user.vault_locked_balance
    
    # BAILOUT_GIFT grants 1000 points
    V2VaultService.deposit(db_session, user.id, 1000)
    db_session.commit()

    db_user = db_session.get(User, user.id)
    assert db_user.vault_locked_balance == initial_balance + 1000

def test_daily_spent_reset_logic(db_session, setup_user):
    """2-2. Strict Withdrawal Policy: Daily spent reset at 9 AM KST."""
    user = setup_user
    
    with patch("app.services.vault_service.get_settings") as mock_settings:
        mock_settings.return_value.streak_day_reset_hour_kst = 9
        mock_settings.return_value.timezone = "Asia/Seoul"
        
        vault_service = VaultService()
        
        # Before reset hour: 2026-01-20 08:00 KST
        now_before = datetime(2026, 1, 19, 23, 0, 0, tzinfo=timezone.utc)
        vault_service._ensure_daily_vault_spent_reset(user, now_before)
        assert user.vault_spent_today == 1000
        
        # After reset hour: 2026-01-20 10:00 KST
        now_after = datetime(2026, 1, 20, 1, 0, 0, tzinfo=timezone.utc)
        vault_service._ensure_daily_vault_spent_reset(user, now_after)
        assert user.vault_spent_today == 0
        assert user.vault_spent_reset_date == "2026-01-20"

def test_shop_config_override_persistence(db_session):
    """4-5. Shop Configuration: Override persistence."""
    sku = "PROD_GOLD_KEY_1"
    overrides = {
        "products": {
            sku: { "title": "Overridden Gold Key", "cost_amount": 999, "is_active": True }
        }
    }
    
    UiConfigService.upsert(db_session, "v2_shop_products", overrides, admin_id=1)
    db_session.commit()
    
    config = UiConfigService.get(db_session, "v2_shop_products")
    assert config.value_json["products"][sku]["cost_amount"] == 999
    assert config.value_json["products"][sku]["title"] == "Overridden Gold Key"
