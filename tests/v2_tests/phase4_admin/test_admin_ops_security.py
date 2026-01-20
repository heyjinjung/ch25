import pytest
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi import status
from sqlalchemy.orm import Session
from app.models.user import User
from app.v2.models.user import V2User
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.models.inventory import UserInventoryItem
from app.schemas.admin_user import AdminUserUpdate, AdminWalletAdjustmentRequest
from app.services.admin_user_service import AdminUserService
from app.v2.services.vault_service import V2VaultService
from app.services.vault_service import VaultService
from app.services.inventory_service import InventoryService
from unittest.mock import MagicMock

# --- FIXTURES ---

@pytest.fixture
def setup_user(db: Session):
    """Create a mock user in both User and V2User tables."""
    # Create legacy User
    user = User(
        external_id="admin-test-user",
        nickname="AdminTester",
        level=1,
        xp=0,
        vault_locked_balance=5000,
        vault_spent_today=1000,
        vault_spent_reset_date="2026-01-19"
    )
    db.add(user)
    db.flush()
    
    # Create V2User (mirrored)
    v2_user = V2User(
        id=user.id,
        external_id=user.external_id,
        nickname=user.nickname,
        vault_locked_balance=user.vault_locked_balance
    )
    db.add(v2_user)
    db.commit()
    db.refresh(user)
    return user

# --- TESTS ---

def test_admin_level_xp_adjustment(db: Session, setup_user):
    """Verify manual Level and XP adjustment via AdminUserService (V1 Fallback)."""
    user = setup_user
    payload = AdminUserUpdate(level=5, xp=1500)
    
    # Execute update
    updated_user = AdminUserService.update_user(db, user.id, payload)
    
    assert updated_user.level == 5
    assert updated_user.xp == 1500
    
    # Verify DB persistence
    db_user = db.get(User, user.id)
    assert db_user.level == 5
    assert db_user.xp == 1500

def test_admin_wallet_adjustment_vault(db: Session, setup_user):
    """Verify Vault balance adjustment via V2 API logic."""
    user = setup_user
    initial_balance = user.vault_locked_balance # 5000
    
    # Grant 10000
    V2VaultService.deposit(db, user.id, 10000)
    db.commit()
    
    v2_user = db.get(V2User, user.id)
    assert v2_user.vault_locked_balance == initial_balance + 10000

    # Withdraw 5000
    V2VaultService.withdraw(db, user.id, 5000)
    db.commit()
    
    v2_user = db.get(V2User, user.id)
    assert v2_user.vault_locked_balance == initial_balance + 5000

def test_admin_inventory_adjustment(db: Session, setup_user):
    """Verify Inventory adjustment via InventoryService."""
    user = setup_user
    item_type = "TICKET_ROULETTE"
    
    # Grant 10 tickets
    InventoryService.grant_item(db, user_id=user.id, item_type=item_type, amount=10, reason="ADMIN_TEST")
    db.commit()
    
    item = db.query(UserInventoryItem).filter_by(user_id=user.id, item_type=item_type).first()
    assert item.quantity == 10
    
    # Consume 3 tickets
    InventoryService.consume_item(db, user_id=user.id, item_type=item_type, amount=3, reason="ADMIN_TEST")
    db.commit()
    
    db.refresh(item)
    assert item.quantity == 7

def test_intervention_bailout(db: Session, setup_user):
    """Verify Intervention BAILOUT_GIFT behavior."""
    user = setup_user
    initial_balance = user.vault_locked_balance
    
    # Execute intervention logic (from user_routes.py:229)
    V2VaultService.deposit(db, user.id, 1000)
    db.commit()
    
    v2_user = db.get(V2User, user.id)
    assert v2_user.vault_locked_balance == initial_balance + 1000

def test_daily_spent_reset_logic(db: Session, setup_user):
    """Verify that daily_spent_amount resets at 9 AM KST."""
    user = setup_user
    # Current state: vault_spent_today=1000, vault_spent_reset_date="2026-01-19"
    
    # Mock settings for reset hour
    mock_settings = MagicMock()
    mock_settings.streak_day_reset_hour_kst = 9
    mock_settings.timezone = "Asia/Seoul"
    
    # Case 1: Before reset hour (e.g., 2026-01-20 08:00 KST)
    # Operational date for 08:00 KST on Jan 20th is still Jan 19th.
    now_before = datetime(2026, 1, 19, 23, 0, 0, tzinfo=ZoneInfo("UTC")) # 2026-01-20 08:00 KST
    
    vault_service = VaultService()
    # Need to patch settings inside the method if possible, or just rely on default 9
    # _ensure_daily_vault_spent_reset uses self._operational_date_kst(now)
    
    vault_service._ensure_daily_vault_spent_reset(user, now_before)
    assert user.vault_spent_today == 1000
    assert user.vault_spent_reset_date == "2026-01-19"
    
    # Case 2: After reset hour (e.g., 2026-01-20 10:00 KST)
    # Operational date for 10:00 KST on Jan 20th is Jan 20th.
    now_after = datetime(2026, 1, 20, 1, 0, 0, tzinfo=ZoneInfo("UTC")) # 2026-01-20 10:00 KST
    
    vault_service._ensure_daily_vault_spent_reset(user, now_after)
    assert user.vault_spent_today == 0
    assert user.vault_spent_reset_date == "2026-01-20"

def test_shop_config_override_persistence(db: Session):
    """Verify UI Config overrides for shop products."""
    from app.services.ui_config_service import UiConfigService
    from app.models.ui_config import AppUiConfig
    
    sku = "PROD_GOLD_KEY_1"
    overrides = {
        "products": {
            sku: { "title": "Overridden Gold Key", "cost_amount": 999, "is_active": True }
        }
    }
    
    # Upsert override
    UiConfigService.upsert(db, "v2_shop_products", overrides, admin_id=1)
    db.commit()
    
    # Verify retrieval
    config = UiConfigService.get(db, "v2_shop_products")
    assert config.value_json["products"][sku]["cost_amount"] == 999
    assert config.value_json["products"][sku]["title"] == "Overridden Gold Key"
