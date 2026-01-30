import pytest
from datetime import datetime, timedelta, date
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException

from app.db.base_class import Base
from app.models.user import User
from app.v2.models.user import V2User
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.v2.models.v2_user_deposit_evidence import V2UserDepositEvidence, EvidenceStatus
from app.models.vault_ledger import VaultLedger
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.v2.services.vault_service import V2VaultService

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
        v2_user = V2User(id=1, cc_id="v2_master_01", nickname="Master")
        db.add(v2_user)
        db.commit()
        yield db
    finally:
        db.close()
        engine.dispose()

def test_vault_deposit_with_suspension_cap(db_session: Session) -> None:
    service = V2VaultService()
    user_id = 1
    
    # 1. Without suspension
    # Mocking is_benefits_suspended to return True to test the cap
    # We'll actually trigger it by making sure there are no deposits
    
    # Check initial: suspended because 0 deposits in 7 days
    is_suspended, dep_7d = service.is_benefits_suspended(db_session, user_id)
    assert is_suspended is True
    
    # Deposit more than 30k
    service.deposit(db_session, user_id, 40000)
    db_session.refresh(db_session.get(V2User, user_id))
    # Should be capped at 30k
    assert service.get_locked_balance(db_session, user_id) == 30000

def test_vault_is_benefits_suspended_latency_bypass(db_session: Session) -> None:
    service = V2VaultService()
    user_id = 1
    
    # Suspended due to 0 deposits
    is_suspended, _ = service.is_benefits_suspended(db_session, user_id)
    assert is_suspended is True
    
    # Add a PENDING evidence to bypass suspension
    evidence = V2UserDepositEvidence(
        user_id=user_id,
        tx_id="TEST_TX_LATENCY_BYPASS",
        claimed_amount=10000,
        status=EvidenceStatus.PENDING,
        created_at=datetime.utcnow()
    )
    db_session.add(evidence)
    db_session.commit()
    
    is_suspended_now, _ = service.is_benefits_suspended(db_session, user_id)
    assert is_suspended_now is False # Bypassed!

def test_vault_consume_locked_for_spend(db_session: Session) -> None:
    service = V2VaultService()
    user_id = 1
    
    # Set initial balance
    user = db_session.get(V2User, user_id)
    user.vault_locked_balance = 10000
    db_session.commit()
    
    # Consume
    service.consume_locked_for_spend(db_session, user_id, 3000, reason="TEST_SPEND")
    
    db_session.refresh(user)
    assert user.vault_locked_balance == 7000
    assert user.vault_spent_today == 3000
    assert user.vault_spent_total == 3000
    
    # Check ledger
    ledger = db_session.query(VaultLedger).filter(VaultLedger.user_id == user_id).first()
    assert ledger.amount == -3000
    assert ledger.reason == "TEST_SPEND"

def test_vault_admin_operations(db_session: Session) -> None:
    service = V2VaultService()
    user_id = 1
    
    # 1. Force Edit
    service.force_edit(db_session, admin_id=99, user_id=user_id, amount=15000, reason="ADMIN_BONUS")
    user = db_session.get(V2User, user_id)
    assert user.vault_locked_balance == 15000
    
    # 2. Get Admin Stats
    # Add a withdrawal to test stats
    req = VaultWithdrawalRequest(user_id=user_id, amount=5000, status="APPROVED", processed_at=datetime.utcnow())
    db_session.add(req)
    req2 = VaultWithdrawalRequest(user_id=user_id, amount=2000, status="PENDING")
    db_session.add(req2)
    db_session.commit()
    
    stats = service.get_admin_stats(db_session)
    assert stats["today_withdrawal_approved"] == 5000
    assert stats["today_withdrawal_pending"] == 2000
    
    # 3. Get User Ledger
    ledger_info = service.get_admin_user_ledger(db_session, user_id)
    assert ledger_info["current_balance"] == 15000
    assert any(item["reason"] == "ADMIN_BONUS" for item in ledger_info["items"])

def test_vault_info_aggregation(db_session: Session) -> None:
    service = V2VaultService()
    user_id = 1
    
    # Mock some data for info
    op_date = service._operational_date_kst(datetime.utcnow())
    delta = ExternalRankingDailyDepositDelta(user_id=1, kst_date=op_date, deposit_delta=10000)
    db_session.add(delta)
    db_session.commit()
    
    info = service.get_vault_info(db_session, user_id)
    assert info["daily_deposit_confirmed"] is True
    assert "vaultBalance" in info
    assert "availableBalance" in info
