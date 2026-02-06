import pytest
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from app.v2.models.user import V2User
from app.v2.models.v2_user_deposit_evidence import V2UserDepositEvidence, EvidenceStatus
from app.v2.models.core.admin_audit_log import AdminAuditLog
from app.v2.services.vault_service import V2VaultService
from app.v2.api.admin.vault_routes import toggle_manual_suspension

@pytest.fixture
def vault_service():
    return V2VaultService()

def test_new_user_grace_period_bypass(db, vault_service):
    """신규 유저(7일 이내)는 무입금 상태여도 자동 제재되지 않아야 함."""
    # 3일 전 가입한 유저
    user = V2User(
        cc_id="new_grace_user", 
        created_at=datetime.now(timezone.utc) - timedelta(days=3),
        benefits_suspended_manual=0
    )
    db.add(user)
    db.flush()

    is_suspended, deposit_7d = vault_service.is_benefits_suspended(db, user.id)
    
    assert deposit_7d == 0
    assert is_suspended is False  # 신규 유저는 유예됨

def test_manual_suspension_priority(db, vault_service):
    """신규 유저이거나 입금이 있더라도, 수동 제재 상태면 제재되어야 함."""
    # 1일 전 가입한 유저 + 수동 제재 설정
    user = V2User(
        cc_id="manual_priority_user", 
        created_at=datetime.now(timezone.utc) - timedelta(days=1),
        benefits_suspended_manual=1
    )
    db.add(user)
    db.flush()

    is_suspended, _ = vault_service.is_benefits_suspended(db, user.id)
    assert is_suspended is True

def test_evidence_bypass_logic(db, vault_service):
    """7일 무입금 상태여도, 최근 24시간 내 입금 증거(PENDING/PROVISIONAL)가 있으면 제재 해제."""
    # 10일 전 가입 + 7일간 무입금 유저
    user = V2User(
        cc_id="evidence_bypass_user", 
        created_at=datetime.now(timezone.utc) - timedelta(days=10),
        benefits_suspended_manual=0
    )
    db.add(user)
    db.flush()

    # 입금 증거 추가 (PENDING, 1시간 전)
    # tx_id 필드가 필수(nullable=False)이므로 추가
    evidence = V2UserDepositEvidence(
        user_id=user.id,
        tx_id="test_tx_123",
        status=EvidenceStatus.PENDING,
        created_at=datetime.now(timezone.utc) - timedelta(hours=1)
    )
    db.add(evidence)
    db.flush()

    is_suspended, _ = vault_service.is_benefits_suspended(db, user.id)
    assert is_suspended is False  # 증거가 있으므로 바이패스됨

def test_toggle_manual_suspension_api_logic(db):
    """수동 제재 토글 API 로직 및 감사 로그 생성 확인."""
    user = V2User(cc_id="api_test_user", benefits_suspended_manual=0)
    db.add(user)
    db.flush()

    # API 직접 호출 (토그링)
    result = toggle_manual_suspension(
        user_id=user.id, 
        suspended=True, 
        db=db, 
        admin_info=(999, "test_admin")
    )
    
    assert result["success"] is True
    assert result["suspended"] is True
    assert user.benefits_suspended_manual == 1

    # 감사 로그 확인 (필드명 after_json 확인)
    audit_log = db.query(AdminAuditLog).filter(
        AdminAuditLog.target_id == str(user.id),
        AdminAuditLog.action == "BENEFITS_SUSPENDED_MANUAL_TOGGLE"
    ).first()
    
    assert audit_log is not None
    assert audit_log.admin_id == 999
    # AdminAuditLog 모델의 필드는 after_json, before_json임
    assert audit_log.after_json["manual_suspension"] is True

def test_toggle_manual_suspension_not_found(db):
    """존재하지 않는 유저 ID로 수동 제재 시 404 발생 확인."""
    with pytest.raises(HTTPException) as excinfo:
        toggle_manual_suspension(
            user_id=999999, 
            suspended=True, 
            db=db, 
            admin_info=(1, "admin")
        )
    assert excinfo.value.status_code == 404
    assert excinfo.value.detail == "USER_NOT_FOUND"
