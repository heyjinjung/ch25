import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.db.base_class import Base

# Import all models to ensure metadata is populated for table creation
from app.models.user import User
from app.v2.models.user import V2User
from app.models.vault2 import VaultProgram, VaultStatus
from app.models.vault_earn_event import VaultEarnEvent
from app.models.user_cash_ledger import UserCashLedger
from app.v2.models.v2_user_segment import V2UserSegment
from app.v2.models.v2_segment_rule import V2SegmentRule
from app.v2.models.v2_admin_message import V2AdminMessage, V2AdminMessageInbox
from app.models.app_ui_config import AppUiConfig
from app.models.admin_audit_log import AdminAuditLog # Added for Vault2Service audits

from app.v2.services.vault2_service import Vault2Service
from app.v2.services.inventory_service import V2InventoryService
from app.v2.services.ticket_zero_service import V2TicketZeroService, TicketZeroEligibilityInput
from app.v2.services.admin_message_service import V2AdminMessageService
from app.v2.services.segment_service import V2SegmentService

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
def v2_user(db_session: Session):
    user = V2User(
        id=200,
        cc_id="e2e0a701-447a-4b9e-8c5e-8b6b6c6b6c6b",
        nickname="EconomyTester",
        vault_locked_balance=0,
        telegram_id=123
    )
    db_session.add(user)
    db_session.flush()
    return user

# --- Vault2Service Coverage ---

def test_vault2_config_merging(db_session):
    service = Vault2Service()
    # Test _deep_merge_dict
    base = {"a": 1, "nested": {"b": 2}}
    override = {"nested": {"c": 3}, "d": 4}
    merged = service._deep_merge_dict(base, override)
    assert merged["nested"]["b"] == 2
    assert merged["nested"]["c"] == 3
    assert merged["d"] == 4

def test_vault2_program_crud(db_session):
    service = Vault2Service()
    program = service.get_default_program(db_session)
    assert program.key == service.DEFAULT_PROGRAM_KEY
    
    # Update config
    service.set_config_value(db_session, "test_key", "test_value")
    val = service.get_config_value(db_session, "test_key")
    assert val == "test_value"
    
    # Toggle game earn
    service.toggle_game_earn(db_session, program_key=program.key, enabled=False)
    assert service.get_config_value(db_session, "enable_game_earn_events") is False

def test_vault2_eligibility(db_session, v2_user):
    service = Vault2Service()
    program_key = service.DEFAULT_PROGRAM_KEY
    
    # Default: eligible
    assert service.get_eligibility(db_session, program_key=program_key, user_id=v2_user.id) is True
    
    # Blocklist
    service.upsert_eligibility(db_session, program_key=program_key, user_id=v2_user.id, eligible=False)
    assert service.get_eligibility(db_session, program_key=program_key, user_id=v2_user.id) is False
    
    # Allowlist
    service.update_config_value(db_session, program_key=program_key, key="eligibility_mode", value="allowlist")
    assert service.get_eligibility(db_session, program_key=program_key, user_id=v2_user.id) is False
    service.upsert_eligibility(db_session, program_key=program_key, user_id=v2_user.id, eligible=True)
    assert service.get_eligibility(db_session, program_key=program_key, user_id=v2_user.id) is True

def test_vault2_transitions(db_session, v2_user):
    service = Vault2Service()
    now = datetime.utcnow()
    
    # Accrue locked
    status = service.accrue_locked(db_session, user_id=v2_user.id, amount=1000, now=now)
    assert status.locked_amount == 1000
    assert status.state == "LOCKED"
    
    # Expire -> transition to AVAILABLE
    past_now = now + timedelta(hours=25)
    updated_count = service.apply_transitions(db_session, now=past_now)
    assert updated_count > 0
    
    db_session.refresh(status)
    assert status.state == "AVAILABLE"
    assert status.available_amount == 1000
    assert status.locked_amount == 0

# --- V2InventoryService Coverage ---

def test_inventory_exchange_logging(db_session, v2_user):
    service = V2InventoryService()
    log = service.log_exchange(
        db_session,
        user_id=v2_user.id,
        input_type="TICKET",
        input_amount=10,
        output_type="POINT",
        output_amount=10000
    )
    assert log.user_id == v2_user.id
    assert log.input_amount == 10
    
    with pytest.raises(ValueError):
        service.log_exchange(db_session, user_id=v2_user.id, input_type="T", input_amount=0, output_type="P", output_amount=1)

# --- V2TicketZeroService Coverage ---

def test_ticket_zero_eligibility():
    service = V2TicketZeroService()
    now = datetime.utcnow()
    
    # Eligible: 0 balance, no pending, no previous claim
    data = TicketZeroEligibilityInput(
        point_balance=0,
        ticket_balance=0,
        has_pending_rewards=False,
        last_claimed_at=None,
        now=now
    )
    assert service.is_eligible(data) is True
    
    # Ineligible: points remaining
    assert service.is_eligible(TicketZeroEligibilityInput(100, 0, False, None, now)) is False
    
    # Ineligible: tickets remaining
    assert service.is_eligible(TicketZeroEligibilityInput(0, 5, False, None, now)) is False
    
    # Ineligible: pending rewards
    assert service.is_eligible(TicketZeroEligibilityInput(0, 0, True, None, now)) is False
    
    # Ineligible: cooldown
    last_claimed = now - timedelta(hours=12)
    assert service.is_eligible(TicketZeroEligibilityInput(0, 0, False, last_claimed, now)) is False
    
    # Eligible: cooldown passed
    last_claimed = now - timedelta(hours=25)
    assert service.is_eligible(TicketZeroEligibilityInput(0, 0, False, last_claimed, now)) is True

# --- V2AdminMessageService Coverage ---

def test_admin_message_fan_out(db_session, v2_user):
    service = V2AdminMessageService()
    
    # Create message
    msg = service.create_message(
        db_session,
        sender_admin_id=1,
        title="Hello",
        content="World",
        target_type="ALL",
        target_value=None
    )
    assert msg.id is not None
    
    # Fan out to ALL
    count = service.fan_out_message(db_session, message_id=msg.id, target_type="ALL", target_value=None)
    assert count >= 1
    
    # Fan out to USER
    count = service.fan_out_message(db_session, message_id=msg.id, target_type="USER", target_value=str(v2_user.id))
    assert count == 1
    
    # Fan out to SEGMENT
    seg = V2UserSegment(user_id=v2_user.id, segment="VIP")
    db_session.add(seg)
    db_session.flush()
    
    count = service.fan_out_message(db_session, message_id=msg.id, target_type="SEGMENT", target_value="VIP")
    assert count == 1

# --- V2SegmentService Coverage ---

def test_segment_service_flow(db_session, v2_user):
    service = V2SegmentService()
    
    # Add a rule
    rule = V2SegmentRule(
        name="High Roller",
        priority=1,
        segment="VIP",
        condition_json={"field": "vault_balance", "op": ">=", "value": 10000},
        enabled=True
    )
    db_session.add(rule)
    db_session.flush()
    
    # User with 0 balance -> NEW (default if no match)
    result = service.segment_user(db_session, v2_user.id)
    assert result.segment == "NEW"
    
    # Increase balance
    v2_user.vault_locked_balance = 20000
    db_session.add(v2_user)
    db_session.flush()
    
    # Re-segment
    result = service.segment_user(db_session, v2_user.id)
    assert result.segment == "VIP"
    assert result.matched_rule == "High Roller"
    
    # Segment all
    stats = service.segment_all_users(db_session)
    assert stats["processed"] >= 1
