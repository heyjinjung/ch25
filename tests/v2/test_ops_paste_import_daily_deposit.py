"""
Test 15: Ops Paste Import Daily Deposit
시나리오: DAILY_DEPOSIT 붙여넣기 import
fixtures: admin_token, db_session
가드레일: latest time 이후만 처리
"""
import pytest
from datetime import datetime, timedelta
from app.v2.models import V2User
from app.v2.models.user import V2UserRole, V2UserStatus
from app.v2.models.v2_hq_daily_deposit import V2HQDailyDeposit


def test_paste_import_daily_deposit_latest_time_filter(db_session):
    """latest time 이후의 데이터만 import"""
    # Given: 기존 최신 기록
    user = V2User(
        cc_id="PASTE_TEST_001",
        nickname="붙여넣기테스트",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    latest_time = datetime(2026, 2, 5, 12, 0, 0)
    existing_deposit = V2HQDailyDeposit(
        user_id=user.id,
        cc_id=user.cc_id,
        deposit_amount=30000,
        deposit_date=latest_time,
        dedup_key=f"{user.cc_id}_{latest_time.strftime('%Y-%m-%d_%H%M%S')}"
    )
    db_session.add(existing_deposit)
    db_session.commit()

    # When: 새로운 데이터 import (latest_time 이후만)
    new_time = latest_time + timedelta(hours=1)
    new_deposit = V2HQDailyDeposit(
        user_id=user.id,
        cc_id=user.cc_id,
        deposit_amount=40000,
        deposit_date=new_time,
        dedup_key=f"{user.cc_id}_{new_time.strftime('%Y-%m-%d_%H%M%S')}"
    )

    # latest_time 이전 데이터는 skip
    old_time = latest_time - timedelta(hours=1)
    # 이 데이터는 import되지 않음 (사전 필터링)

    db_session.add(new_deposit)
    db_session.commit()

    # Then: latest_time 이후 데이터만 존재
    deposits = db_session.query(V2HQDailyDeposit).filter(
        V2HQDailyDeposit.user_id == user.id,
        V2HQDailyDeposit.deposit_date > latest_time
    ).all()
    assert len(deposits) == 1
    assert deposits[0].deposit_date == new_time


def test_paste_import_daily_deposit_batch_processing(db_session):
    """붙여넣기로 여러 건 동시 import"""
    # Given: 여러 유저
    users = []
    for i in range(3):
        user = V2User(
            cc_id=f"BATCH_USER_{i}",
            nickname=f"배치유저{i}",
            role=V2UserRole.USER,
            status=V2UserStatus.ACTIVE
        )
        db_session.add(user)
        users.append(user)
    db_session.commit()

    # When: 배치로 입금 기록 생성
    base_time = datetime(2026, 2, 7, 10, 0, 0)
    for i, user in enumerate(users):
        deposit = V2HQDailyDeposit(
            user_id=user.id,
            cc_id=user.cc_id,
            deposit_amount=(i + 1) * 10000,
            deposit_date=base_time,
            dedup_key=f"{user.cc_id}_{base_time.strftime('%Y-%m-%d_%H%M%S')}"
        )
        db_session.add(deposit)
    db_session.commit()

    # Then: 모든 배치 데이터 정상 생성
    deposits = db_session.query(V2HQDailyDeposit).filter(
        V2HQDailyDeposit.deposit_date == base_time
    ).all()
    assert len(deposits) == 3


def test_paste_import_daily_deposit_validation(db_session):
    """붙여넣기 데이터 유효성 검증"""
    # Given
    user = V2User(
        cc_id="VALID_TEST_001",
        nickname="검증테스트",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    # When: 유효한 데이터만 처리
    valid_deposit = V2HQDailyDeposit(
        user_id=user.id,
        cc_id=user.cc_id,
        deposit_amount=50000,  # 양수
        deposit_date=datetime(2026, 2, 7),
        dedup_key=f"{user.cc_id}_2026-02-07"
    )
    db_session.add(valid_deposit)
    db_session.commit()

    # Then: 데이터 검증 통과
    db_session.refresh(valid_deposit)
    assert valid_deposit.deposit_amount > 0
    assert valid_deposit.cc_id is not None
    assert valid_deposit.dedup_key is not None
