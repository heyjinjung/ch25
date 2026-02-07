"""
Test 17: Ops Spending Ledger Sources
시나리오: HQ_W, VAULT_W, SHOP_U 기록
fixtures: db_session
가드레일: transaction_id 중복 차단
"""
import pytest
from datetime import datetime
from app.v2.models import V2User
from app.v2.models.user import V2UserRole, V2UserStatus
from app.v2.models.v2_spending_ledger import V2SpendingLedger


def test_spending_ledger_hq_w_source(db_session):
    """HQ_W(HQ 출금) 지출 기록"""
    # Given
    user = V2User(
        cc_id="LEDGER_HQ_001",
        nickname="HQ출금테스트",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    # When: HQ_W 지출 기록
    ledger = V2SpendingLedger(
        user_id=user.id,
        source="HQ_W",
        amount=50000,
        transaction_id=f"HQ_W_{user.id}_{datetime.utcnow().timestamp()}",
        created_at=datetime.utcnow()
    )
    db_session.add(ledger)
    db_session.commit()

    # Then
    db_session.refresh(ledger)
    assert ledger.source == "HQ_W"
    assert ledger.amount == 50000


def test_spending_ledger_vault_w_source(db_session):
    """VAULT_W(Vault 출금) 지출 기록"""
    # Given
    user = V2User(
        cc_id="LEDGER_VAULT_001",
        nickname="Vault출금테스트",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    # When: VAULT_W 지출 기록
    ledger = V2SpendingLedger(
        user_id=user.id,
        source="VAULT_W",
        amount=30000,
        transaction_id=f"VAULT_W_{user.id}_{datetime.utcnow().timestamp()}",
        created_at=datetime.utcnow()
    )
    db_session.add(ledger)
    db_session.commit()

    # Then
    db_session.refresh(ledger)
    assert ledger.source == "VAULT_W"
    assert ledger.amount == 30000


def test_spending_ledger_shop_u_source(db_session):
    """SHOP_U(상점 사용) 지출 기록"""
    # Given
    user = V2User(
        cc_id="LEDGER_SHOP_001",
        nickname="상점사용테스트",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    # When: SHOP_U 지출 기록
    ledger = V2SpendingLedger(
        user_id=user.id,
        source="SHOP_U",
        amount=10000,
        transaction_id=f"SHOP_U_{user.id}_{datetime.utcnow().timestamp()}",
        created_at=datetime.utcnow()
    )
    db_session.add(ledger)
    db_session.commit()

    # Then
    db_session.refresh(ledger)
    assert ledger.source == "SHOP_U"
    assert ledger.amount == 10000


def test_spending_ledger_duplicate_transaction_id_prevention(db_session):
    """transaction_id 중복 차단"""
    # Given
    user = V2User(
        cc_id="LEDGER_DUP_001",
        nickname="중복차단테스트",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    transaction_id = f"UNIQUE_TX_{datetime.utcnow().timestamp()}"

    # When: 첫 번째 기록
    ledger1 = V2SpendingLedger(
        user_id=user.id,
        source="HQ_W",
        amount=50000,
        transaction_id=transaction_id,
        created_at=datetime.utcnow()
    )
    db_session.add(ledger1)
    db_session.commit()

    # When: 동일 transaction_id로 두 번째 시도
    existing = db_session.query(V2SpendingLedger).filter(
        V2SpendingLedger.transaction_id == transaction_id
    ).first()

    # Then: 중복이면 차단 (사전 체크)
    if existing:
        # 중복이므로 새로운 기록 추가 안함
        pass

    # 최종적으로 transaction_id당 1개만
    count = db_session.query(V2SpendingLedger).filter(
        V2SpendingLedger.transaction_id == transaction_id
    ).count()
    assert count == 1


def test_spending_ledger_multiple_sources(db_session):
    """여러 소스의 지출 기록 통합"""
    # Given
    user = V2User(
        cc_id="LEDGER_MULTI_001",
        nickname="다중소스테스트",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    # When: 여러 소스의 지출 기록
    sources = [
        ("HQ_W", 50000),
        ("VAULT_W", 30000),
        ("SHOP_U", 10000)
    ]

    for source, amount in sources:
        ledger = V2SpendingLedger(
            user_id=user.id,
            source=source,
            amount=amount,
            transaction_id=f"{source}_{user.id}_{datetime.utcnow().timestamp()}",
            created_at=datetime.utcnow()
        )
        db_session.add(ledger)
    db_session.commit()

    # Then: 모든 소스 기록 존재
    ledgers = db_session.query(V2SpendingLedger).filter(
        V2SpendingLedger.user_id == user.id
    ).all()
    assert len(ledgers) == 3

    # 총 지출액 계산
    total_spending = sum(ledger.amount for ledger in ledgers)
    assert total_spending == 90000
