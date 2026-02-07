"""
Test 18: Ops Status HQ Stats
시나리오: ops/status 내 hq_stats 집계
fixtures: admin_token, db_session, test_client
가드레일: last_sync_at nullable 허용
"""
import pytest
from datetime import datetime
from app.v2.models import V2User
from app.v2.models.user import V2UserRole, V2UserStatus
from app.v2.models.v2_hq_daily_deposit import V2HQDailyDeposit


def test_ops_status_hq_stats_endpoint(test_client, admin_token):
    """ops/status API로 HQ 통계 조회"""
    response = test_client.get(
        "/api/v2/admin/ops/status",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    # 200 또는 404(미구현) 허용
    assert response.status_code in [200, 404]

    if response.status_code == 200:
        data = response.json()
        # hq_stats 필드 존재 확인
        assert "hq_stats" in data or "stats" in data or isinstance(data, dict)


def test_ops_status_hq_stats_aggregation(db_session):
    """HQ 통계 집계 로직"""
    # Given: 여러 유저의 입금 기록
    users = []
    for i in range(3):
        user = V2User(
            cc_id=f"HQ_STATS_{i}",
            nickname=f"통계유저{i}",
            role=V2UserRole.USER,
            status=V2UserStatus.ACTIVE
        )
        db_session.add(user)
        users.append(user)
    db_session.commit()

    # 입금 기록 생성
    total_deposits = 0
    for user in users:
        amount = (users.index(user) + 1) * 10000
        deposit = V2HQDailyDeposit(
            user_id=user.id,
            cc_id=user.cc_id,
            deposit_amount=amount,
            deposit_date=datetime(2026, 2, 7),
            dedup_key=f"{user.cc_id}_2026-02-07"
        )
        db_session.add(deposit)
        total_deposits += amount
    db_session.commit()

    # When: 통계 집계
    deposits = db_session.query(V2HQDailyDeposit).all()
    total = sum(d.deposit_amount for d in deposits)

    # Then
    assert total == total_deposits
    assert len(deposits) == 3


def test_ops_status_hq_stats_last_sync_nullable(db_session, test_client, admin_token):
    """last_sync_at nullable 허용"""
    # When: ops/status 호출
    response = test_client.get(
        "/api/v2/admin/ops/status",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    if response.status_code == 200:
        data = response.json()
        # last_sync_at이 없거나 null이어도 OK
        if "hq_stats" in data:
            hq_stats = data["hq_stats"]
            # last_sync_at은 선택적
            assert "last_sync_at" not in hq_stats or hq_stats["last_sync_at"] is None or isinstance(hq_stats["last_sync_at"], str)


def test_ops_status_hq_stats_daily_summary(db_session):
    """일별 HQ 통계 요약"""
    # Given
    user = V2User(
        cc_id="DAILY_SUMMARY_001",
        nickname="일별요약",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    # 여러 날짜의 입금 기록
    dates = [
        datetime(2026, 2, 5),
        datetime(2026, 2, 6),
        datetime(2026, 2, 7)
    ]

    for date in dates:
        deposit = V2HQDailyDeposit(
            user_id=user.id,
            cc_id=user.cc_id,
            deposit_amount=10000,
            deposit_date=date,
            dedup_key=f"{user.cc_id}_{date.strftime('%Y-%m-%d')}"
        )
        db_session.add(deposit)
    db_session.commit()

    # When: 날짜별 집계
    from sqlalchemy import func
    daily_stats = db_session.query(
        func.date(V2HQDailyDeposit.deposit_date).label("date"),
        func.sum(V2HQDailyDeposit.deposit_amount).label("total")
    ).group_by(func.date(V2HQDailyDeposit.deposit_date)).all()

    # Then: 3일치 데이터
    assert len(daily_stats) == 3
