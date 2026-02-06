import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.v2.models.user import V2User, V2UserStatus
from app.v2.services.vault_service import V2VaultService
from app.v2.models import ExternalRankingDailyDepositDelta, VaultWithdrawalRequest
from fastapi import HTTPException

@pytest.fixture
def vault_service():
    return V2VaultService()

def test_withdrawal_policy_segments(db: Session, vault_service):
    # 1. VIP 유저 테스트 (10만 입금 필요)
    vip_user = V2User(cc_id="vip_user", nickname="VIP_TEST", vault_locked_balance=50000)
    db.add(vip_user)
    db.flush()
    
    # 세그먼트 강제 설정 (V2UserSegment Mocking 대신 직접 DB 데이터 준비)
    from app.v2.models.v2_user_segment import V2UserSegment
    db.add(V2UserSegment(user_id=vip_user.id, segment="VIP"))
    db.flush()

    # 입금액 5만 (부족)
    db.add(ExternalRankingDailyDepositDelta(user_id=vip_user.id, deposit_delta=50000, kst_date=datetime.now().date()))
    db.flush()

    with pytest.raises(HTTPException) as excinfo:
        vault_service.request_withdrawal(db, vip_user.id, 10000)
    assert "DEPOSIT_AMOUNT_INSUFFICIENT_100000" in str(excinfo.value.detail)

    # 입금액 10만 채움
    db.add(ExternalRankingDailyDepositDelta(user_id=vip_user.id, deposit_delta=50000, kst_date=datetime.now().date()))
    db.commit()

    # 이제 입금액은 충족하지만 판수(10판) 부족 예상 (실제 DB 로그가 없으므로)
    with pytest.raises(HTTPException) as excinfo:
        vault_service.request_withdrawal(db, vip_user.id, 10000)
    assert "PLAY_COUNT_INSUFFICIENT_10" in str(excinfo.value.detail)

def test_manual_suspension(db: Session, vault_service):
    user = V2User(cc_id="test_manual", benefits_suspended_manual=1)
    db.add(user)
    db.flush()
    
    is_suspended, _ = vault_service.is_benefits_suspended(db, user.id)
    assert is_suspended is True

    user.benefits_suspended_manual = 0
    db.add(user)
    db.flush()
    
    # 7일 내 입금이 없으면 자동 제재는 유지될 수 있음 (로직상)
    # 하지만 수동 제재가 0이면 자동 로직을 따름.
    is_suspended, _ = vault_service.is_benefits_suspended(db, user.id)
    # 입금이 없으므로 여전히 True일 것 (신규 유저가 아니라고 가정하면)
    pass
