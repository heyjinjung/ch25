from datetime import datetime, timedelta
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base_class import Base
from app.models.user import User
from app.models.vault2 import VaultProgram, VaultStatus
from app.models.vault_earn_event import VaultEarnEvent
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.models.user_cash_ledger import UserCashLedger
from app.models.external_ranking import ExternalRankingData
from app.v2.services.vault2_service import Vault2Service
from unittest.mock import MagicMock, patch
from typing import Any

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
    # Ensure default program exists
    service.get_default_program(db_session, ensure=True)
    
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
    from app.models.vault_earn_event import VaultEarnEvent
    event = VaultEarnEvent(
        user_id=user_id,
        earn_event_id="test_accrual_x",
        amount=2000,
        earn_type="POINT",
        source="DICE",
        reward_kind="VAULT",
        created_at=datetime.utcnow()
    )
    db_session.add(event)
    db_session.commit()
    
    details = service.get_vault_detail_stats(db_session, type="today_accrual")
    assert any(d["user_id"] == user_id for d in details)

def test_vault2_extended_admin_and_stats(db_session: Session) -> None:
    service = Vault2Service()
    user_id = 1
    program = service.get_default_program(db_session, ensure=True)
    
    # 1. Eligibility & Upsert
    service.upsert_eligibility(db_session, program_key=program.key, user_id=user_id, eligible=True)
    assert service.get_eligibility(db_session, program_key=program.key, user_id=user_id) is True
    
    service.upsert_eligibility(db_session, program_key=program.key, user_id=user_id, eligible=False)
    assert service.get_eligibility(db_session, program_key=program.key, user_id=user_id) is False
    
    # 2. Program Active Toggle
    service.update_program_active(db_session, program_key=program.key, is_active=False)
    db_session.refresh(program)
    assert program.is_active is False
    
    # 3. get_vault_stats deeper branches
    # Seed data for stats
    db_session.add(ExternalRankingData(user_id=user_id, deposit_amount=5000000))
    db_session.add(VaultWithdrawalRequest(user_id=user_id, amount=10000, status="PENDING"))
    db_session.commit()
    
    stats = service.get_vault_stats(db_session)
    assert stats["total_liabilities"] > 0
    assert stats["total_assets"] >= 5000000
    
    # 4. get_vault_detail_stats other types
    # withdrawal
    details = service.get_vault_detail_stats(db_session, type="withdrawal")
    assert any(d["user_id"] == user_id for d in details)
    
    # audit
    details = service.get_vault_detail_stats(db_session, type="audit")
    assert isinstance(details, list)
    
    # expiring_soon_24h
    user = db_session.get(User, user_id)
    user.vault_locked_balance = 1000
    user.vault_locked_expires_at = datetime.utcnow() + timedelta(hours=10)
    db_session.commit()
    details = service.get_vault_detail_stats(db_session, type="expiring_soon_24h")
    assert any(d["user_id"] == user_id for d in details)

def test_vault2_internal_helpers(db_session: Session) -> None:
    service = Vault2Service()
    
    # _deep_merge_dict
    base = {"a": 1, "b": {"c": 2}}
    override = {"b": {"d": 3}, "e": 4}
    merged = service._deep_merge_dict(base, override)
    assert merged["b"]["c"] == 2
    assert merged["b"]["d"] == 3
    assert merged["e"] == 4
    
    # _build_effective_config
    eff = service._build_effective_config({"eligibility_mode": "allowlist"})
    assert eff["eligibility_mode"] == "allowlist"
    assert eff["enable_game_earn_events"] is True # default preserved

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
