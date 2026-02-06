"""
V2 Integrated Level Flow Test (E2E)
SOT Documents:
- 02_v2_level_xp_storage_sync_sot_ko.md (Sync, Audit)
- 03_v2_level_point_earning_rules_sot_ko.md (Rules)
- 04_v2_level_reward_table_and_db_sot_ko.md (Reward Table)
"""
import pytest
from sqlalchemy.orm import Session
from app.v2.models import V2User, UserLevelProgress, UserLevelRewardLog, GameTokenType
from app.v2.models.v2_level_reward import V2LevelRewardTable
from app.v2.services.level_xp_service import V2LevelXPService
from app.v2.services.inventory_service import V2InventoryService

@pytest.fixture
def level_flow_setup(db: Session):
    """Seed Data for Level Flow Test."""
    # Seed Reward Table (Minimal needed for test)
    if db.query(V2LevelRewardTable).count() < 5:
        db.query(V2LevelRewardTable).delete()
        rewards = [
            V2LevelRewardTable(level=1, required_xp=0, reward_type="NONE", reward_amount=0),
            V2LevelRewardTable(level=2, required_xp=100, reward_type="ROULETTE_TICKET", reward_amount=1),
            V2LevelRewardTable(level=3, required_xp=300, reward_type="DICE_TICKET", reward_amount=2),
        ]
        db.add_all(rewards)
        db.commit()

    # Create User
    user = V2User(cc_id="LEVEL_FLOW_USER", nickname="FlowTester", level=1, xp=0)
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Ensure no previous logs
    db.query(UserLevelRewardLog).filter_by(user_id=user.id).delete()
    db.commit()
    
    return user

def test_deposit_triggers_level_up_and_reward(db: Session, level_flow_setup: V2User):
    user = level_flow_setup
    service = V2LevelXPService()
    
    # 1. Deposit 500,000 KRW -> 100 XP -> Level 2
    # Simulate Deposit Effect (calling add_xp directly as AdminCCDepositService calls it)
    # SOT 03: 500k -> 100 XP
    
    delta_xp = 100
    service.add_xp(db, user.id, delta_xp, source="CC_DEPOSIT", meta={"deposit_id": "test_1"})
    db.commit()
    
    # Verify Primary SoT
    db.refresh(user)
    assert user.xp == 100
    assert user.level == 2
    
    # Verify Reward (Level 2 grants 1 Roulette Ticket)
    # Check UserLevelRewardLog (Idempotency Key)
    log = db.query(UserLevelRewardLog).filter_by(user_id=user.id, level=2).first()
    assert log is not None
    
    # Check Inventory (Assuming grant_ticket works)
    # Note: If V2InventoryService is mocked in conftest, verify calls. 
    # If using real DB, check table.
    # Here we assume integration test environment has real/sqlite DB.
    ticket_bal = V2InventoryService.get_wallet_balance(db, user.id, GameTokenType.ROULETTE_TICKET)
    # Note: If no previous balance, it should be 1.
    assert ticket_bal >= 1

def test_idempotency_prevents_duplicate_reward(db: Session, level_flow_setup: V2User):
    user = level_flow_setup
    service = V2LevelXPService()
    
    # 1. Reach Level 2
    service.add_xp(db, user.id, 100, "CC_DEPOSIT", {})
    db.commit()
    
    # Capture state
    db.refresh(user)
    initial_ticket_bal = V2InventoryService.get_wallet_balance(db, user.id, GameTokenType.ROULETTE_TICKET)
    
    # 2. Add more XP (Stay at Level 2, e.g. +10 XP) -> Should NOT trigger Level 2 reward again
    # Or Force Re-eval (if logic allows re-checking)
    # But usually idempotency check prevents re-grant even if logic re-visits.
    
    # Let's try to manually check reward for Level 2 again (simulating race or re-process)
    # The service `add_xp` handles checks.
    
    service.add_xp(db, user.id, 10, "CC_DEPOSIT", {}) # Add small XP, stay in Level 2
    db.commit()
    
    # Verify Balance unchanged
    new_ticket_bal = V2InventoryService.get_wallet_balance(db, user.id, GameTokenType.ROULETTE_TICKET)
    assert new_ticket_bal == initial_ticket_bal

def test_mirror_sync_on_level_change(db: Session, level_flow_setup: V2User):
    user = level_flow_setup
    service = V2LevelXPService()
    
    # 1. Change Level
    service.add_xp(db, user.id, 300, "CC_DEPOSIT", {}) # 0 -> 300 XP (Level 3)
    db.commit()
    
    # 2. Check Mirror
    mirror = db.query(UserLevelProgress).filter_by(user_id=user.id).first()
    assert mirror is not None
    assert mirror.level == 3
    assert mirror.xp == 300
