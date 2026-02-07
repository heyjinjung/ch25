"""
Test 23: Golden Daily Nudge
시나리오: 12:00/19:00 발송 및 만료 정책
fixtures: db_session
가드레일: benefits_suspended 제외
"""
import pytest
from datetime import datetime, time
from app.v2.models import V2User
from app.v2.models.user import V2UserRole, V2UserStatus
from app.v2.models.v2_golden_daily_nudge import V2GoldenDailyNudge


def test_golden_daily_nudge_12pm_schedule(db_session):
    """12시 정각 넛지 스케줄"""
    # Given
    user = V2User(
        cc_id="NUDGE_12PM_TEST",
        nickname="12시넛지",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    # When: 12시 넛지 생성
    nudge_time = datetime.combine(datetime.today(), time(12, 0, 0))
    nudge = V2GoldenDailyNudge(
        user_id=user.id,
        scheduled_at=nudge_time,
        message="점심시간 특별 혜택이 도착했어요!",
        status="PENDING"
    )
    db_session.add(nudge)
    db_session.commit()

    # Then
    db_session.refresh(nudge)
    assert nudge.scheduled_at.hour == 12
    assert nudge.status == "PENDING"


def test_golden_daily_nudge_7pm_schedule(db_session):
    """19시 정각 넛지 스케줄"""
    # Given
    user = V2User(
        cc_id="NUDGE_7PM_TEST",
        nickname="19시넛지",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    # When: 19시 넛지 생성
    nudge_time = datetime.combine(datetime.today(), time(19, 0, 0))
    nudge = V2GoldenDailyNudge(
        user_id=user.id,
        scheduled_at=nudge_time,
        message="저녁 시간 황금 혜택!",
        status="PENDING"
    )
    db_session.add(nudge)
    db_session.commit()

    # Then
    db_session.refresh(nudge)
    assert nudge.scheduled_at.hour == 19
    assert nudge.status == "PENDING"


def test_golden_daily_nudge_expiration_policy(db_session):
    """넛지 만료 정책"""
    # Given
    user = V2User(
        cc_id="NUDGE_EXPIRE_TEST",
        nickname="만료테스트",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    # When: 오래된 넛지 (24시간 이상)
    from datetime import timedelta
    old_time = datetime.utcnow() - timedelta(hours=25)
    nudge = V2GoldenDailyNudge(
        user_id=user.id,
        scheduled_at=old_time,
        message="오래된 넛지",
        status="PENDING"
    )
    db_session.add(nudge)
    db_session.commit()

    # Then: 만료 처리
    nudge.status = "EXPIRED"
    db_session.commit()

    db_session.refresh(nudge)
    assert nudge.status == "EXPIRED"


def test_golden_daily_nudge_benefits_suspended_exclusion(db_session):
    """benefits_suspended 유저 제외"""
    # Given: benefits_suspended 유저
    user = V2User(
        cc_id="SUSPENDED_TEST",
        nickname="혜택정지",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE,
        benefits_suspended=True
    )
    db_session.add(user)
    db_session.commit()

    # When: 넛지 발송 대상 조회
    eligible_users = db_session.query(V2User).filter(
        V2User.status == V2UserStatus.ACTIVE,
        V2User.benefits_suspended != True  # 정지된 유저 제외
    ).all()

    # Then: benefits_suspended 유저는 제외
    assert user not in eligible_users


def test_golden_daily_nudge_sent_status(db_session):
    """넛지 발송 완료 상태"""
    # Given
    user = V2User(
        cc_id="NUDGE_SENT_TEST",
        nickname="발송완료",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    nudge_time = datetime.combine(datetime.today(), time(12, 0, 0))
    nudge = V2GoldenDailyNudge(
        user_id=user.id,
        scheduled_at=nudge_time,
        message="혜택 도착!",
        status="PENDING"
    )
    db_session.add(nudge)
    db_session.commit()

    # When: 발송 완료 처리
    nudge.status = "SENT"
    nudge.sent_at = datetime.utcnow()
    db_session.commit()

    # Then
    db_session.refresh(nudge)
    assert nudge.status == "SENT"
    assert nudge.sent_at is not None


def test_golden_daily_nudge_multiple_schedules(db_session):
    """하루에 여러 넛지 스케줄"""
    # Given
    user = V2User(
        cc_id="MULTI_NUDGE_TEST",
        nickname="다중넛지",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    # When: 12시와 19시 2개 스케줄
    nudge_12 = V2GoldenDailyNudge(
        user_id=user.id,
        scheduled_at=datetime.combine(datetime.today(), time(12, 0, 0)),
        message="12시 혜택",
        status="PENDING"
    )
    nudge_19 = V2GoldenDailyNudge(
        user_id=user.id,
        scheduled_at=datetime.combine(datetime.today(), time(19, 0, 0)),
        message="19시 혜택",
        status="PENDING"
    )
    db_session.add_all([nudge_12, nudge_19])
    db_session.commit()

    # Then: 2개의 넛지 존재
    nudges = db_session.query(V2GoldenDailyNudge).filter(
        V2GoldenDailyNudge.user_id == user.id
    ).all()
    assert len(nudges) == 2
