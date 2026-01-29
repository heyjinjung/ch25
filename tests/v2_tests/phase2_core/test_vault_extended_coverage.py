from datetime import datetime, timedelta
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base_class import Base
from app.models.user import User
from app.models.vault2 import VaultProgram, VaultStatus
from app.v2.services.vault2_service import Vault2Service

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
        user = User(id=1, external_id="test_user", nickname="Tester")
        db.add(user)
        db.commit()
        yield db
    finally:
        db.close()
        engine.dispose()

def test_vault2_accrue_locked_logic(db_session: Session) -> None:
    service = Vault2Service()
    user_id = 1
    amount = 1000

    # 1. Initial accrual
    status = service.accrue_locked(db_session, user_id=user_id, amount=amount)
    assert status.locked_amount == amount
    assert status.state == "LOCKED"
    assert status.locked_at is not None
    
    # Check event log
    events = status.progress_json.get("events", [])
    assert len(events) == 1
    assert events[0]["type"] == "ACCRUE_LOCKED"
    assert events[0]["amount"] == amount

    # 2. Additive accrual
    status = service.accrue_locked(db_session, user_id=user_id, amount=500)
    assert status.locked_amount == 1500
    assert len(status.progress_json["events"]) == 2

    # 3. Invalid amount
    with pytest.raises(ValueError, match="INVALID_ACCRUAL_AMOUNT"):
        service.accrue_locked(db_session, user_id=user_id, amount=0)

def test_vault2_unlock_event_recording(db_session: Session) -> None:
    service = Vault2Service()
    user_id = 1
    unlock_amount = 300

    # Record unlock event (skipping circuit breaker for simplicity in unit test)
    status = service.record_unlock_event(
        db_session, 
        user_id=user_id, 
        unlock_amount=unlock_amount, 
        trigger="TEST_TRIGGER",
        skip_circuit_breaker=True
    )
    
    assert status.user_id == user_id
    events = status.progress_json.get("events", [])
    assert events[-1]["type"] == "UNLOCK"
    assert events[-1]["amount"] == unlock_amount
    assert events[-1]["trigger"] == "TEST_TRIGGER"

def test_vault2_state_transitions(db_session: Session) -> None:
    service = Vault2Service()
    user_id = 1
    
    # 1. Accrue with expiry (24h default)
    now = datetime.utcnow()
    status = service.accrue_locked(db_session, user_id=user_id, amount=1000, now=now)
    assert status.expires_at is not None
    
    # 2. Transition: LOCKED -> AVAILABLE (Expiry passed)
    future_now = now + timedelta(hours=25)
    updated_count = service.apply_transitions(db_session, now=future_now)
    assert updated_count == 1
    
    db_session.refresh(status)
    assert status.state == "AVAILABLE"
    assert status.locked_amount == 0
    assert status.available_amount == 1000
    
    # 3. Transition: AVAILABLE -> EXPIRED (Grace window)
    program = service.get_default_program(db_session)
    # Set grace window to 1 hour
    service.update_program_unlock_rules(
        db_session, 
        program_key=program.key, 
        unlock_rules_json={"available_grace_hours": 1}
    )
    
    way_future_now = future_now + timedelta(hours=2)
    updated_count = service.apply_transitions(db_session, now=way_future_now)
    assert updated_count == 1
    
    db_session.refresh(status)
    assert status.state == "EXPIRED"
    assert status.available_amount == 0

def test_vault2_program_helpers(db_session: Session) -> None:
    service = Vault2Service()
    
    # list_programs
    programs = service.list_programs(db_session)
    assert len(programs) >= 1
    assert any(p.key == service.DEFAULT_PROGRAM_KEY for p in programs)
    
    # top_statuses (empty initially)
    top = service.top_statuses(db_session)
    assert len(top) == 0
    
    # Add some data
    service.accrue_locked(db_session, user_id=1, amount=5000)
    top = service.top_statuses(db_session)
    assert len(top) == 1
    assert top[0][0].locked_amount == 5000

def test_vault2_balance_updates_and_details(db_session: Session) -> None:
    service = Vault2Service()
    user_id = 1
    
    # Ensure default program exists
    service.get_default_program(db_session, ensure=True)
    
    # 1. Update Balance (Absolute Set in Vault2)
    # Using set_balance which exists in Vault2Service
    status = service.set_balance(db_session, user_id=user_id, locked_amount=1000, available_amount=500, reason="TEST_SET", admin_id=7)
    assert status.locked_amount == 1000
    assert status.available_amount == 500
    
    # 2. Get Detail Stats branches
    # Mock some data for different stats types
    # "liabilities"
    details = service.get_vault_detail_stats(db_session, type="liabilities")
    assert len(details) > 0
    
    # "today_accrual"
    service.accrue_locked(db_session, user_id=user_id, amount=2000)
    details = service.get_vault_detail_stats(db_session, type="today_accrual")
    assert any(d["user_id"] == user_id for d in details)

def test_vault2_config_management(db_session: Session) -> None:
    service = Vault2Service()
    # Ensure default program exists
    program = service.get_default_program(db_session, ensure=True)
    
    # 1. Update program attributes
    service.update_program_unlock_rules(db_session, program_key=program.key, unlock_rules_json={"new_rule": 1})
    db_session.refresh(program)
    assert program.unlock_rules_json["new_rule"] == 1
    
    service.update_program_ui_copy(db_session, program_key=program.key, ui_copy_json={"title": "New Title"})
    db_session.refresh(program)
    assert program.ui_copy_json["title"] == "New Title"
    
    # 2. Config helpers
    # toggle_manual_overrides doesn't exist, using update_program_config
    service.update_program_config(db_session, program_key=program.key, config_json={"feature_x": True})
    assert service.get_config_value(db_session, "feature_x") is True
