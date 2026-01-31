import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.v2.models.user import V2User
from app.v2.models.v2_user_deposit_evidence import V2UserDepositEvidence, EvidenceStatus
from app.v2.services.latency_survival_service import V2LatencySurvivalService
from app.v2.services.vault_service import V2VaultService
from app.v2.services.inventory_service import V2InventoryService
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta

@pytest.fixture
def v2_user(db: Session):
    # Set created_at to 10 days ago to bypass the 7-day grace period in suspension logic
    user = V2User(
        cc_id="test_cc_id",
        nickname="TestUser",
        vault_locked_balance=0,
        created_at=datetime.now(timezone.utc) - timedelta(days=10)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def test_submit_evidence_grants_provisional_reward(db: Session, v2_user):
    # Given
    tx_id = "TX_12345"
    claimed_amount = 50000
    
    # When
    evidence = V2LatencySurvivalService.submit_evidence(
        db, v2_user.id, tx_id, claimed_amount
    )
    
    # Then
    assert evidence.status == EvidenceStatus.PROVISIONAL
    assert evidence.reward_json == {"ROULETTE_TICKET": 5}
    
    # Check Inventory Grant
    balance = V2InventoryService.get_wallet_balance(db, v2_user.id, "ROULETTE_TICKET")
    assert balance == 5

def test_submit_evidence_rate_limit(db: Session, v2_user):
    # Submit 3 (Max)
    for i in range(3):
        V2LatencySurvivalService.submit_evidence(db, v2_user.id, f"TX_RATE_{i}", 10000)
    
    # 4th should fail with 429
    with pytest.raises(HTTPException) as exc:
        V2LatencySurvivalService.submit_evidence(db, v2_user.id, "TX_RATE_FAIL", 10000)
    assert exc.value.status_code == 429
    assert exc.value.detail == "RATE_LIMIT_EXCEEDED"

def test_submit_evidence_duplicate_tx(db: Session, v2_user):
    tx_id = "TX_DUP"
    V2LatencySurvivalService.submit_evidence(db, v2_user.id, tx_id, 10000)
    
    with pytest.raises(HTTPException) as exc:
        V2LatencySurvivalService.submit_evidence(db, v2_user.id, tx_id, 10000)
    assert exc.value.status_code == 400
    assert exc.value.detail == "DUPLICATE_TX_ID"

def test_verify_evidence_keeps_reward(db: Session, v2_user):
    # Given
    evidence = V2LatencySurvivalService.submit_evidence(
        db, v2_user.id, "TX_VERIFY", 50000
    )
    
    # When
    verified = V2LatencySurvivalService.verify_evidence(
        db, 1, evidence.id, matched_log_id=999, memo="Confirmed"
    )
    
    # Then
    assert verified.status == EvidenceStatus.VERIFIED
    assert verified.matched_log_id == 999
    
    # Reward should persist
    balance = V2InventoryService.get_wallet_balance(db, v2_user.id, "ROULETTE_TICKET")
    assert balance == 5

def test_reject_evidence_clawbacks_reward(db: Session, v2_user):
    # Given
    evidence = V2LatencySurvivalService.submit_evidence(
        db, v2_user.id, "TX_REJECT", 50000
    )
    assert V2InventoryService.get_wallet_balance(db, v2_user.id, "ROULETTE_TICKET") == 5
    
    # When
    rejected = V2LatencySurvivalService.reject_evidence(
        db, 1, evidence.id, reason="Fraud"
    )
    
    # Then
    assert rejected.status == EvidenceStatus.REJECTED
    
    # Reward should be clawed back
    balance = V2InventoryService.get_wallet_balance(db, v2_user.id, "ROULETTE_TICKET")
    assert balance == 0

def test_benefits_suspension_bypass(db: Session, v2_user):
    # Given: User with 0 deposit in last 7 days -> Suspended
    # (Mocking ExternalRankingDailyDepositDelta effectively 0)
    
    is_suspended, _ = V2VaultService.is_benefits_suspended(db, v2_user.id)
    assert is_suspended is True
    
    # When: User submits evidence
    V2LatencySurvivalService.submit_evidence(
        db, v2_user.id, "TX_BYPASS", 100000
    )
    
    # Then: User should NOT be suspended anymore
    is_suspended_now, _ = V2VaultService.is_benefits_suspended(db, v2_user.id)
    assert is_suspended_now is False

def test_benefits_suspension_bypass_expiry(db: Session, v2_user):
    # Given: Evidence submitted 25 hours ago
    evidence = V2LatencySurvivalService.submit_evidence(
        db, v2_user.id, "TX_EXPIRED", 100000
    )
    # Manual backdate (Ensure aware comparison if needed, though DB handles Naive UTC usually)
    evidence.created_at = datetime.now(timezone.utc) - timedelta(hours=25)
    db.add(evidence)
    db.commit()
    
    # Then: User should be suspended again
    is_suspended, _ = V2VaultService.is_benefits_suspended(db, v2_user.id)
    assert is_suspended is True
