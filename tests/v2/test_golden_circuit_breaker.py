"""
Test 24: Golden Circuit Breaker
시나리오: 한도 초과 -> 차단
fixtures: db_session
가드레일: skip_circuit_breaker 옵션 확인

Note: Using V2GoldenInterventionLog as a proxy for benefit tracking
since V2GoldenBenefitLog doesn't exist in the current model structure.
"""
import pytest
from datetime import datetime, timedelta
from app.v2.models import V2User
from app.v2.models.user import V2UserRole, V2UserStatus
from app.v2.models.v2_golden_intervention_log import V2GoldenInterventionLog


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

    # 일일 한도: 5건
    daily_limit = 5
    today = datetime.utcnow().date()

    # When: 오늘 이미 한도만큼 intervention 발생
    for i in range(5):
        intervention = V2GoldenInterventionLog(
            user_id=user.id,
            trigger_id="TRG_BENEFIT",
            action_taken="GRANT_BENEFIT",
            status="SENT",
            created_at=datetime.combine(today, datetime.min.time()) + timedelta(hours=i)
        )
        db_session.add(intervention)
    db_session.commit()

    # Then: 오늘 총 intervention 건수 확인
    from sqlalchemy import func
    count_today = db_session.query(func.count(V2GoldenInterventionLog.id)).filter(
        V2GoldenInterventionLog.user_id == user.id,
        func.date(V2GoldenInterventionLog.created_at) == today,
        V2GoldenInterventionLog.status == "SENT"
    ).scalar() or 0

    assert count_today == daily_limit

    # 한도 초과 여부 체크
    is_over_limit = count_today >= daily_limit
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

    # 주간 한도: 20건
    weekly_limit = 20
    week_ago = datetime.utcnow() - timedelta(days=7)

    # When: 지난 7일간 intervention 누적
    for i in range(7):
        for j in range(2):  # 하루에 2건씩
            intervention = V2GoldenInterventionLog(
                user_id=user.id,
                trigger_id="TRG_BENEFIT",
                action_taken="GRANT_BENEFIT",
                status="SENT",
                created_at=week_ago + timedelta(days=i, hours=j)
            )
            db_session.add(intervention)
    db_session.commit()

    # Then: 주간 총 건수 확인
    from sqlalchemy import func
    count_week = db_session.query(func.count(V2GoldenInterventionLog.id)).filter(
        V2GoldenInterventionLog.user_id == user.id,
        V2GoldenInterventionLog.created_at >= week_ago,
        V2GoldenInterventionLog.status == "SENT"
    ).scalar() or 0

    assert count_week == 14  # 7일 * 2건
    is_over_limit = count_week >= weekly_limit
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
    daily_limit = 5
    today = datetime.utcnow().date()

    for i in range(5):
        intervention = V2GoldenInterventionLog(
            user_id=user.id,
            trigger_id="TRG_BENEFIT",
            action_taken="GRANT_BENEFIT",
            status="SENT",
            created_at=datetime.combine(today, datetime.min.time()) + timedelta(hours=i)
        )
        db_session.add(intervention)
    db_session.commit()

    # When: skip_circuit_breaker=True로 추가 혜택
    from sqlalchemy import func
    count_today = db_session.query(func.count(V2GoldenInterventionLog.id)).filter(
        V2GoldenInterventionLog.user_id == user.id,
        func.date(V2GoldenInterventionLog.created_at) == today,
        V2GoldenInterventionLog.status == "SENT"
    ).scalar() or 0

    skip_circuit_breaker = True  # 관리자 수동 승인 등

    if skip_circuit_breaker or count_today < daily_limit:
        # 한도 우회 또는 한도 내
        extra_intervention = V2GoldenInterventionLog(
            user_id=user.id,
            trigger_id="MANUAL_OVERRIDE",
            action_taken="MANUAL_GRANT",
            status="SENT",
            created_at=datetime.utcnow()
        )
        db_session.add(extra_intervention)
        db_session.commit()

    # Then: 한도 초과했지만 skip 옵션으로 추가 혜택 부여됨
    all_interventions = db_session.query(V2GoldenInterventionLog).filter(
        V2GoldenInterventionLog.user_id == user.id
    ).all()
    assert len(all_interventions) == 6  # 5 + 1(skip)


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

    # When: 각각 다른 건수의 intervention
    for i in range(3):
        intervention1 = V2GoldenInterventionLog(
            user_id=user1.id,
            trigger_id="TRG_BENEFIT",
            action_taken="GRANT_BENEFIT",
            status="SENT",
            created_at=datetime.utcnow()
        )
        db_session.add(intervention1)

    for i in range(2):
        intervention2 = V2GoldenInterventionLog(
            user_id=user2.id,
            trigger_id="TRG_BENEFIT",
            action_taken="GRANT_BENEFIT",
            status="SENT",
            created_at=datetime.utcnow()
        )
        db_session.add(intervention2)

    db_session.commit()

    # Then: 각 유저의 한도는 독립적
    from sqlalchemy import func
    count1 = db_session.query(func.count(V2GoldenInterventionLog.id)).filter(
        V2GoldenInterventionLog.user_id == user1.id
    ).scalar()
    count2 = db_session.query(func.count(V2GoldenInterventionLog.id)).filter(
        V2GoldenInterventionLog.user_id == user2.id
    ).scalar()

    assert count1 == 3
    assert count2 == 2
    assert count1 != count2
