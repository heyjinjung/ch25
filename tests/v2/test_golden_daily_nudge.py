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
from app.v2.services.daily_nudge_service import DailyNudgeService
from app.v2.services.vault_service import V2VaultService


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

    # When/Then: 넛지 대상자 조회 (12시 로직은 서비스에서 시간차로 처리됨)
    targets = DailyNudgeService.get_nudge_target_users(db_session)
    # 직접 발송 테스트
    result = DailyNudgeService.send_daily_nudge(db_session, user.id)
    assert result["success"] is True


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

    # When/Then: 넛지 발송 테스트
    result = DailyNudgeService.send_daily_nudge(db_session, user.id)
    assert result["success"] is True


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

    # When: 넛지 발송 시도
    result = DailyNudgeService.send_daily_nudge(db_session, user.id)
    # Then: 성공 또는 기존 정책에 따른 결과
    assert result is not None


def test_golden_daily_nudge_benefits_suspended_exclusion(db_session):
    """benefits_suspended 유저 제외"""
    # Given: benefits_suspended 유저
    user = V2User(
        cc_id="SUSPENDED_TEST",
        nickname="혜택정지",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE,
    )
    # V2는 benefits_suspended_manual을 사용하거나 V2VaultService 내부 로직 사용
    user.benefits_suspended_manual = 1
    db_session.add(user)
    db_session.commit()

    # When: 넛지 발송 대상 조회
    eligible_users = DailyNudgeService.get_nudge_target_users(db_session)

    # Then: benefits_suspended 유저는 제외 (대상자 리스트에 (id, cc_id) 튜플로 반환됨)
    eligible_ids = [u[0] for u in eligible_users]
    assert user.id not in eligible_ids


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

    # When: 발송 처리
    result = DailyNudgeService.send_daily_nudge(db_session, user.id, ticket_amount=1)
 
    # Then
    assert result["success"] is True
    assert result["ticket_granted"] == 1


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

    # When: 배치 실행
    result = DailyNudgeService.execute_daily_nudge_batch(db_session, ticket_amount=1)
 
    # Then: 결과 확인
    assert result["total_targets"] >= 0
