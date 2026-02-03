"""Tests for pending sync users (미동기화 유저 재동기화) feature.

이 테스트는 다음 시나리오를 검증합니다:
- 케이스 A: V2User.external_nickname 있음 + HQ 데이터 있음 + 미매칭
- 케이스 B: V2User.external_nickname 있음 + HQ 데이터 없음
- 중복 방지 로직: HQ 중복 연결, V2User 중복 연결, 델타/XP/미션 중복 처리 방지
"""
from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

import pytest

from app.v2.models.user import V2User
from app.v2.models.v2_user_segment import V2UserSegment
from app.v2.models.hq_prospective_user import HQProspectiveUser
from app.v2.services.hq_margin_import_service import HQMarginImportService
from app.v2.services.admin_cc_deposit_service import V2AdminCCDepositService


def create_v2_user(
    db,
    *,
    nickname: str,
    external_nickname: str | None = None,
    hq_segment: str | None = None,
    cc_id: str | None = None,
) -> V2User:
    """테스트용 V2User 생성 헬퍼."""
    user = V2User(
        cc_id=cc_id or f"CC_{nickname}",
        nickname=nickname,
        external_nickname=external_nickname,
        hq_segment=hq_segment,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_hq_prospect(
    db,
    *,
    nickname: str,
    segment: str = "COMMON",
    total_charge: int = 0,
    total_margin: int = 0,
    linked_user_id: int | None = None,
    is_joined: bool = False,
) -> HQProspectiveUser:
    """테스트용 HQProspectiveUser 생성 헬퍼."""
    prospect = HQProspectiveUser(
        nickname=nickname,
        cc_id=f"HQ_{nickname}",
        segment=segment,
        total_charge=total_charge,
        total_margin=total_margin,
        linked_user_id=linked_user_id,
        is_joined=is_joined,
    )
    db.add(prospect)
    db.commit()
    db.refresh(prospect)
    return prospect


class TestSyncPendingExternalUsers:
    """sync_pending_external_users 함수 테스트."""

    def test_case_a_auto_sync_success(self, db):
        """케이스 A: external_nickname 있고 HQ 매칭 가능 → 자동 동기화."""
        # Given: V2User with external_nickname but no hq_segment
        user = create_v2_user(
            db,
            nickname="참새참새",
            external_nickname="참새참새",
            hq_segment=None,  # 미동기화 상태
        )
        
        # Given: HQ prospect with same nickname, not linked
        prospect = create_hq_prospect(
            db,
            nickname="참새참새",
            segment="WHALE",
            total_charge=150000,
            linked_user_id=None,
            is_joined=False,
        )
        
        # When: sync_pending_external_users 실행
        with patch.object(V2AdminCCDepositService, 'upsert_many', return_value=[]) as mock_cc:
            result = HQMarginImportService.sync_pending_external_users(db)
        
        # Then: 동기화 성공
        assert result["synced"] == 1
        assert result["skipped"] == 0
        assert result["total_pending"] == 1
        
        # Then: V2User 업데이트 확인
        db.refresh(user)
        assert user.hq_segment == "WHALE"
        
        # Then: HQProspectiveUser 연결 확인
        db.refresh(prospect)
        assert prospect.is_joined is True
        assert prospect.linked_user_id == user.id
        
        # Then: details 확인
        assert len(result["details"]) == 1
        assert result["details"][0]["user_id"] == user.id
        assert result["details"][0]["segment"] == "WHALE"

    def test_case_b_no_hq_match_skip(self, db):
        """케이스 B: external_nickname 있지만 HQ 데이터 없음 → 스킵."""
        # Given: V2User with external_nickname, but no matching HQ
        user = create_v2_user(
            db,
            nickname="지민공식",
            external_nickname="지민공식",
            hq_segment=None,
        )
        # HQ에는 "지민공식" 없음
        
        # When
        result = HQMarginImportService.sync_pending_external_users(db)
        
        # Then: 스킵됨
        assert result["synced"] == 0
        assert result["skipped"] == 1
        assert result["total_pending"] == 1
        
        # Then: V2User 변경 없음
        db.refresh(user)
        assert user.hq_segment is None

    def test_already_linked_hq_skip(self, db):
        """중복 방지: 이미 다른 유저에 연결된 HQ는 스킵."""
        # Given: 기존 유저가 이미 HQ에 연결됨
        existing_user = create_v2_user(
            db,
            nickname="기존유저",
            external_nickname="중복닉네임",
            hq_segment="VIP",
        )
        prospect = create_hq_prospect(
            db,
            nickname="중복닉네임",
            segment="VIP",
            linked_user_id=existing_user.id,  # 이미 연결됨
            is_joined=True,
        )
        
        # Given: 새 유저가 같은 external_nickname을 가짐 (비정상 상황)
        new_user = create_v2_user(
            db,
            nickname="새유저",
            external_nickname="중복닉네임",
            hq_segment=None,  # 미동기화
        )
        
        # When
        result = HQMarginImportService.sync_pending_external_users(db)
        
        # Then: 새 유저는 스킵됨 (HQ가 이미 연결됨)
        assert result["synced"] == 0
        assert result["skipped"] == 1
        
        # Then: 새 유저는 변경 없음
        db.refresh(new_user)
        assert new_user.hq_segment is None

    def test_user_already_has_segment_skip(self, db):
        """중복 방지: 이미 hq_segment가 있는 유저는 대상에서 제외."""
        # Given: V2User with external_nickname AND hq_segment (이미 동기화됨)
        user = create_v2_user(
            db,
            nickname="이미동기화",
            external_nickname="이미동기화",
            hq_segment="WHALE",  # 이미 설정됨
        )
        
        # When
        result = HQMarginImportService.sync_pending_external_users(db)
        
        # Then: 대상이 없음 (hq_segment가 있으면 미동기화 대상이 아님)
        assert result["total_pending"] == 0
        assert result["synced"] == 0
        assert result["skipped"] == 0

    def test_case_insensitive_nickname_match(self, db):
        """닉네임 매칭은 대소문자 무시."""
        # Given: V2User with lowercase external_nickname
        user = create_v2_user(
            db,
            nickname="테스트유저",
            external_nickname="TestUser",  # mixed case
            hq_segment=None,
        )
        
        # Given: HQ with different case nickname
        prospect = create_hq_prospect(
            db,
            nickname="testuser",  # lowercase
            segment="VIP",
            total_charge=100000,
        )
        
        # When
        with patch.object(V2AdminCCDepositService, 'upsert_many', return_value=[]):
            result = HQMarginImportService.sync_pending_external_users(db)
        
        # Then: 매칭 성공
        assert result["synced"] == 1
        db.refresh(user)
        assert user.hq_segment == "VIP"

    def test_cc_deposit_processed_on_sync(self, db):
        """동기화 시 CC Deposit 처리 호출 확인."""
        # Given
        user = create_v2_user(
            db,
            nickname="충전유저",
            external_nickname="충전유저",
            hq_segment=None,
        )
        prospect = create_hq_prospect(
            db,
            nickname="충전유저",
            segment="WHALE",
            total_charge=500000,
        )
        
        # When
        with patch.object(V2AdminCCDepositService, 'upsert_many', return_value=[]) as mock_cc:
            result = HQMarginImportService.sync_pending_external_users(db)
        
        # Then: CC Deposit 처리 호출됨
        mock_cc.assert_called_once()
        call_args = mock_cc.call_args[0]
        payloads = call_args[1]  # (db, payloads)
        assert len(payloads) == 1
        assert payloads[0].user_id == user.id
        assert payloads[0].deposit_amount == 500000

    def test_multiple_pending_users_batch(self, db):
        """여러 미동기화 유저 일괄 처리."""
        # Given: 3명의 미동기화 유저
        users = []
        for i in range(3):
            user = create_v2_user(
                db,
                nickname=f"유저{i}",
                external_nickname=f"유저{i}",
                hq_segment=None,
            )
            users.append(user)
            create_hq_prospect(
                db,
                nickname=f"유저{i}",
                segment="COMMON",
                total_charge=100000 * (i + 1),
            )
        
        # When
        with patch.object(V2AdminCCDepositService, 'upsert_many', return_value=[]):
            result = HQMarginImportService.sync_pending_external_users(db)
        
        # Then
        assert result["synced"] == 3
        assert result["skipped"] == 0
        assert result["total_pending"] == 3
        assert len(result["details"]) == 3

    def test_v2_user_segment_created_on_sync(self, db):
        """동기화 시 V2UserSegment 생성 확인."""
        # Given
        user = create_v2_user(
            db,
            nickname="세그먼트테스트",
            external_nickname="세그먼트테스트",
            hq_segment=None,
        )
        prospect = create_hq_prospect(
            db,
            nickname="세그먼트테스트",
            segment="VIP",
            total_charge=200000,
        )
        
        # When
        with patch.object(V2AdminCCDepositService, 'upsert_many', return_value=[]):
            result = HQMarginImportService.sync_pending_external_users(db)
        
        # Then: V2UserSegment 생성됨
        segment = db.query(V2UserSegment).filter_by(user_id=user.id).first()
        assert segment is not None
        assert segment.segment == "VIP"
        assert segment.is_synced_from_hq is True

    def test_v2_user_segment_updated_if_exists(self, db):
        """기존 V2UserSegment가 있으면 업데이트."""
        # Given
        user = create_v2_user(
            db,
            nickname="업데이트테스트",
            external_nickname="업데이트테스트",
            hq_segment=None,
        )
        # 기존 세그먼트 (이전에 다른 경로로 생성됨)
        old_segment = V2UserSegment(
            user_id=user.id,
            segment="COMMON",
            is_synced_from_hq=False,
        )
        db.add(old_segment)
        db.commit()
        
        prospect = create_hq_prospect(
            db,
            nickname="업데이트테스트",
            segment="WHALE",
            total_charge=300000,
        )
        
        # When
        with patch.object(V2AdminCCDepositService, 'upsert_many', return_value=[]):
            result = HQMarginImportService.sync_pending_external_users(db)
        
        # Then: V2UserSegment 업데이트됨
        db.refresh(old_segment)
        assert old_segment.segment == "WHALE"
        assert old_segment.is_synced_from_hq is True
