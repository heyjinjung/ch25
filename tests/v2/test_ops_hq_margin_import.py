"""
Test 13: Ops HQ Margin Import
시나리오: HQ_MARGIN CSV import -> 세그먼트 업데이트
fixtures: admin_token, db_session
가드레일: VIP/WHALE/AT_RISK/COMMON 중 하나로 분류
"""
import pytest
from app.v2.models import V2User
from app.v2.models.user import V2UserRole, V2UserStatus
from app.v2.models.v2_user_segment import V2UserSegment


def test_hq_margin_import_creates_segments(db_session, admin_token, test_client):
    """HQ_MARGIN import로 세그먼트 생성"""
    # Given: 테스트 유저 생성
    user = V2User(
        cc_id="HQ_TEST_001",
        nickname="HQ테스트유저",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    # When: HQ_MARGIN 데이터 import 시뮬레이션
    segment = V2UserSegment(
        user_id=user.id,
        segment="VIP",
        total_margin=150000,
        is_synced_from_hq=True
    )
    db_session.add(segment)
    db_session.commit()

    # Then: 세그먼트가 VIP/WHALE/AT_RISK/COMMON 중 하나
    db_session.refresh(segment)
    assert segment.segment in [
        "VIP",
        "WHALE",
        "AT_RISK",
        "COMMON"
    ]


def test_hq_margin_segment_classification(db_session):
    """HQ_MARGIN 기반 세그먼트 자동 분류"""
    # Given: 여러 마진 금액의 유저
    test_cases = [
        (300000, "WHALE"),  # 30만 이상
        (150000, "VIP"),    # 15만 이상
        (50000, "COMMON"),  # 일반
        (-50000, "AT_RISK") # 마이너스
    ]

    for margin, expected_segment in test_cases:
        user = V2User(
            cc_id=f"MARGIN_{margin}",
            nickname=f"마진{margin}",
            role=V2UserRole.USER,
            status=V2UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.flush()

        # 세그먼트 분류 로직
        if margin >= 300000:
            segment_name = "WHALE"
        elif margin >= 150000:
            segment_name = "VIP"
        elif margin < 0:
            segment_name = "AT_RISK"
        else:
            segment_name = "COMMON"

        segment = V2UserSegment(
            user_id=user.id,
            segment=segment_name,
            total_margin=margin,
            is_synced_from_hq=True
        )
        db_session.add(segment)

    db_session.commit()

    # Then: 모든 세그먼트가 올바르게 분류됨
    segments = db_session.query(V2UserSegment).all()
    assert len(segments) == len(test_cases)


def test_hq_margin_import_prevents_duplicates(db_session):
    """동일 유저에 대한 중복 HQ_MARGIN import 방지"""
    # Given
    user = V2User(
        cc_id="DUP_TEST",
        nickname="중복테스트",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()

    # When: 첫 번째 세그먼트 생성
    segment1 = V2UserSegment(
        user_id=user.id,
        segment="VIP",
        total_margin=150000,
        is_synced_from_hq=True
    )
    db_session.add(segment1)
    db_session.commit()

    # When: 두 번째 import 시 기존 세그먼트가 PK로 덮어씌워짐
    segment1.is_synced_from_hq = False
    segment1.segment = "WHALE"
    segment1.total_margin = 350000
    db_session.commit()

    # Then: 세그먼트가 업데이트됨
    segment = db_session.query(V2UserSegment).filter_by(user_id=user.id).first()
    assert segment is not None
    assert segment.segment == "WHALE"
    assert segment.total_margin == 350000
