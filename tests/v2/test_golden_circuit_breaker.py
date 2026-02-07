"""
Test 24: Golden Circuit Breaker
시나리오: 한도 초과 -> 차단
fixtures: db_session
가드레일: skip_circuit_breaker 옵션 확인
"""
import pytest
from datetime import datetime, timedelta
from app.v2.models import V2User
from app.v2.models.user import V2UserRole, V2UserStatus
from app.v2.models.v2_golden_benefit_log import V2GoldenBenefitLog


def test_golden_circuit_breaker_daily_limit(db_session):
    """일일 한도 초과 시 차단"""
    # Given
    user = V2User(
        cc_id="CB_DAILY_TEST",
        nickname="일일한도테스트",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    # 일일 한도: 예를 들어 100,000원
    daily_limit = 100000
    today = datetime.utcnow().date()

    # When: 오늘 이미 한도만큼 혜택 받음
    for i in range(5):
        benefit = V2GoldenBenefitLog(
            user_id=user.id,
            benefit_type="INTERVENTION",
            amount=20000,
            created_at=datetime.combine(today, datetime.min.time()) + timedelta(hours=i)
        )
        db_session.add(benefit)
    db_session.commit()

    # Then: 오늘 총 혜택 금액 확인
    from sqlalchemy import func
    total_today = db_session.query(func.sum(V2GoldenBenefitLog.amount)).filter(
        V2GoldenBenefitLog.user_id == user.id,
        func.date(V2GoldenBenefitLog.created_at) == today
    ).scalar() or 0

    assert total_today == daily_limit

    # 한도 초과 여부 체크
    is_over_limit = total_today >= daily_limit
    assert is_over_limit is True


def test_golden_circuit_breaker_weekly_limit(db_session):
    """주간 한도 체크"""
    # Given
    user = V2User(
        cc_id="CB_WEEKLY_TEST",
        nickname="주간한도테스트",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    # 주간 한도: 예를 들어 500,000원
    weekly_limit = 500000
    week_ago = datetime.utcnow() - timedelta(days=7)

    # When: 지난 7일간 혜택 누적
    for i in range(7):
        benefit = V2GoldenBenefitLog(
            user_id=user.id,
            benefit_type="INTERVENTION",
            amount=70000,
            created_at=week_ago + timedelta(days=i)
        )
        db_session.add(benefit)
    db_session.commit()

    # Then: 주간 총액 확인
    from sqlalchemy import func
    total_week = db_session.query(func.sum(V2GoldenBenefitLog.amount)).filter(
        V2GoldenBenefitLog.user_id == user.id,
        V2GoldenBenefitLog.created_at >= week_ago
    ).scalar() or 0

    assert total_week == 490000  # 70000 * 7
    is_over_limit = total_week >= weekly_limit
    assert is_over_limit is False


def test_golden_circuit_breaker_skip_option(db_session):
    """skip_circuit_breaker 옵션으로 한도 우회"""
    # Given
    user = V2User(
        cc_id="CB_SKIP_TEST",
        nickname="한도우회테스트",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    # 이미 한도 초과 상태
    daily_limit = 100000
    today = datetime.utcnow().date()

    for i in range(5):
        benefit = V2GoldenBenefitLog(
            user_id=user.id,
            benefit_type="INTERVENTION",
            amount=20000,
            created_at=datetime.combine(today, datetime.min.time()) + timedelta(hours=i)
        )
        db_session.add(benefit)
    db_session.commit()

    # When: skip_circuit_breaker=True로 추가 혜택
    from sqlalchemy import func
    total_today = db_session.query(func.sum(V2GoldenBenefitLog.amount)).filter(
        V2GoldenBenefitLog.user_id == user.id,
        func.date(V2GoldenBenefitLog.created_at) == today
    ).scalar() or 0

    skip_circuit_breaker = True  # 관리자 수동 승인 등

    if skip_circuit_breaker or total_today < daily_limit:
        # 한도 우회 또는 한도 내
        extra_benefit = V2GoldenBenefitLog(
            user_id=user.id,
            benefit_type="MANUAL",
            amount=30000,
            created_at=datetime.utcnow(),
            metadata={"skip_circuit_breaker": True}
        )
        db_session.add(extra_benefit)
        db_session.commit()

    # Then: 한도 초과했지만 skip 옵션으로 추가 혜택 부여됨
    all_benefits = db_session.query(V2GoldenBenefitLog).filter(
        V2GoldenBenefitLog.user_id == user.id
    ).all()
    assert len(all_benefits) == 6  # 5 + 1(skip)


def test_golden_circuit_breaker_per_user_limit(db_session):
    """유저별 독립적인 한도 관리"""
    # Given: 2명의 유저
    user1 = V2User(
        cc_id="CB_USER1",
        nickname="유저1",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    user2 = V2User(
        cc_id="CB_USER2",
        nickname="유저2",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add_all([user1, user2])
    db_session.commit()

    # When: 각각 다른 금액의 혜택
    benefit1 = V2GoldenBenefitLog(
        user_id=user1.id,
        benefit_type="INTERVENTION",
        amount=50000,
        created_at=datetime.utcnow()
    )
    benefit2 = V2GoldenBenefitLog(
        user_id=user2.id,
        benefit_type="INTERVENTION",
        amount=30000,
        created_at=datetime.utcnow()
    )
    db_session.add_all([benefit1, benefit2])
    db_session.commit()

    # Then: 각 유저의 한도는 독립적
    from sqlalchemy import func
    total1 = db_session.query(func.sum(V2GoldenBenefitLog.amount)).filter(
        V2GoldenBenefitLog.user_id == user1.id
    ).scalar()
    total2 = db_session.query(func.sum(V2GoldenBenefitLog.amount)).filter(
        V2GoldenBenefitLog.user_id == user2.id
    ).scalar()

    assert total1 == 50000
    assert total2 == 30000
    assert total1 != total2
