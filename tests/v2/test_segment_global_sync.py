"""세그먼트 전역 동기화 테스트 (2026-02-17 수정분).

수정 내역:
1. 어드민 세그먼트 변경 시 previous_segment 기록 + pending_segment 초기화
2. WINNER 세그먼트 출금조건 매핑 추가
3. pending_segment 자동적용 제거 (어드민 설정 보호)
"""
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.orm import Session

from app.v2.models.user import V2User, V2UserRole, V2UserStatus
from app.v2.models.v2_user_segment import V2UserSegment
from app.v2.services.vault_service import V2VaultService
from app.v2.services.segment_service import V2SegmentService


# ──────────────────────────────────────────────
# 1. SEGMENT_WITHDRAWAL_CONDITIONS: WINNER 매핑
# ──────────────────────────────────────────────

class TestSegmentWithdrawalConditionsMapping:
    """SEGMENT_WITHDRAWAL_CONDITIONS에 6개 세그먼트 모두 매핑 확인."""

    ALL_SEGMENTS = ["NEW", "COMMON", "VIP", "WHALE", "AT_RISK", "WINNER"]

    def test_all_segments_have_conditions(self):
        """6개 세그먼트 모두 SEGMENT_WITHDRAWAL_CONDITIONS에 존재해야 한다."""
        for seg in self.ALL_SEGMENTS:
            assert seg in V2VaultService.SEGMENT_WITHDRAWAL_CONDITIONS, (
                f"{seg} 세그먼트가 SEGMENT_WITHDRAWAL_CONDITIONS에 없음"
            )

    @pytest.mark.parametrize(
        "segment, expected_play, expected_spend, expected_deposit",
        [
            ("NEW", 5, 0, 10000),
            ("COMMON", 15, 5000, 10000),
            ("VIP", 10, 0, 100000),
            ("WHALE", 0, 0, 100000),
            ("AT_RISK", 30, 10000, 10000),
            ("WINNER", 30, 10000, 10000),
        ],
    )
    def test_segment_conditions_values(self, segment, expected_play, expected_spend, expected_deposit):
        """각 세그먼트별 출금조건 값이 정확한지 확인."""
        conds = V2VaultService.SEGMENT_WITHDRAWAL_CONDITIONS[segment]
        assert conds["play_target"] == expected_play
        assert conds["spend_target"] == expected_spend
        assert conds["min_deposit_target"] == expected_deposit


class TestGetWithdrawalTargets:
    """_get_withdrawal_targets() 세그먼트별 정확한 반환 확인."""

    @pytest.mark.parametrize(
        "segment, expected",
        [
            ("NEW", (5, 0, 10000)),
            ("COMMON", (15, 5000, 10000)),
            ("VIP", (10, 0, 100000)),
            ("WHALE", (0, 0, 100000)),
            ("AT_RISK", (30, 10000, 10000)),
            ("WINNER", (30, 10000, 10000)),
        ],
    )
    def test_known_segments(self, segment, expected):
        """매핑된 세그먼트는 정확한 조건 반환."""
        result = V2VaultService._get_withdrawal_targets(segment, 0)
        assert result == expected

    def test_winner_no_fallback(self):
        """WINNER 세그먼트는 폴백이 아닌 매핑된 조건을 반환해야 한다."""
        result = V2VaultService._get_withdrawal_targets("WINNER", 0)
        # 폴백(30, 10000, 10000)과 값은 같지만 매핑을 통해 반환
        assert "WINNER" in V2VaultService.SEGMENT_WITHDRAWAL_CONDITIONS
        assert result == (30, 10000, 10000)

    def test_unknown_segment_fallback_low_deposit(self):
        """미매핑 세그먼트 + 낮은 입금 → 가장 엄격한 폴백."""
        result = V2VaultService._get_withdrawal_targets("UNKNOWN_SEG", 0)
        assert result == (30, 10000, 10000)

    def test_unknown_segment_fallback_high_deposit(self):
        """미매핑 세그먼트 + 고액 입금 → 완화된 폴백."""
        result = V2VaultService._get_withdrawal_targets("UNKNOWN_SEG", 3_000_000)
        assert result == (10, 0, 100000)

    def test_case_insensitive(self):
        """대소문자 무관하게 작동."""
        result_lower = V2VaultService._get_withdrawal_targets("winner", 0)
        result_upper = V2VaultService._get_withdrawal_targets("WINNER", 0)
        assert result_lower == result_upper

    def test_grace_period_new_to_common(self):
        """Grace Period: NEW→COMMON 전환 후 3일 이내면 NEW 조건 유지."""
        now = datetime.utcnow()
        result = V2VaultService._get_withdrawal_targets(
            "COMMON",
            0,
            previous_segment="NEW",
            transitioned_at=now - timedelta(hours=12),
        )
        assert result == (5, 0, 10000)  # NEW 조건

    def test_grace_period_expired(self):
        """Grace Period: 3일 초과면 현재 세그먼트 조건 적용."""
        old_time = datetime.utcnow() - timedelta(days=5)
        result = V2VaultService._get_withdrawal_targets(
            "COMMON",
            0,
            previous_segment="NEW",
            transitioned_at=old_time,
        )
        assert result == (15, 5000, 10000)  # COMMON 조건


# ──────────────────────────────────────────────
# 2. 어드민 세그먼트 변경 API 검증
# ──────────────────────────────────────────────

class TestAdminSegmentUpdate:
    """어드민 세그먼트 변경 시 previous_segment/pending_segment 처리 검증."""

    def test_admin_update_sets_previous_segment(self, db: Session, admin_token, test_client):
        """어드민 세그먼트 변경 시 previous_segment가 기록되어야 한다."""
        # 유저 + 세그먼트 생성
        user = V2User(id=7001, cc_id="seg_test_7001", nickname="test_prev_seg",
                      role=V2UserRole.USER, status=V2UserStatus.ACTIVE)
        db.add(user)
        db.flush()
        seg = V2UserSegment(user_id=7001, segment="COMMON")
        db.add(seg)
        db.commit()

        # COMMON → VIP 변경
        resp = test_client.patch(
            "/api/v2/admin/users/7001/segment",
            json={"segment": "VIP"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["oldSegment"] == "COMMON"
        assert data["newSegment"] == "VIP"

        # DB 확인
        db.expire_all()
        updated = db.get(V2UserSegment, 7001)
        assert updated.segment == "VIP"
        assert updated.previous_segment == "COMMON"

    def test_admin_update_clears_pending_segment(self, db: Session, admin_token, test_client):
        """어드민 세그먼트 변경 시 pending_segment가 초기화되어야 한다."""
        user = V2User(id=7002, cc_id="seg_test_7002", nickname="test_clear_pending",
                      role=V2UserRole.USER, status=V2UserStatus.ACTIVE)
        db.add(user)
        db.flush()
        # HQ import로 pending_segment가 설정된 상태
        seg = V2UserSegment(user_id=7002, segment="COMMON", pending_segment="VIP")
        db.add(seg)
        db.commit()

        # 어드민이 AT_RISK로 변경
        resp = test_client.patch(
            "/api/v2/admin/users/7002/segment",
            json={"segment": "AT_RISK"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200

        db.expire_all()
        updated = db.get(V2UserSegment, 7002)
        assert updated.segment == "AT_RISK"
        assert updated.pending_segment is None  # 핵심: pending 초기화됨

    def test_admin_update_same_segment_no_previous(self, db: Session, admin_token, test_client):
        """같은 세그먼트로 변경 시 previous_segment는 갱신하지 않는다."""
        user = V2User(id=7003, cc_id="seg_test_7003", nickname="test_same_seg",
                      role=V2UserRole.USER, status=V2UserStatus.ACTIVE)
        db.add(user)
        db.flush()
        seg = V2UserSegment(user_id=7003, segment="VIP", previous_segment="NEW")
        db.add(seg)
        db.commit()

        # VIP → VIP (동일)
        resp = test_client.patch(
            "/api/v2/admin/users/7003/segment",
            json={"segment": "VIP"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200

        db.expire_all()
        updated = db.get(V2UserSegment, 7003)
        assert updated.segment == "VIP"
        assert updated.previous_segment == "NEW"  # 변경되지 않음

    def test_admin_update_winner_segment(self, db: Session, admin_token, test_client):
        """WINNER 세그먼트로 변경 가능해야 한다."""
        user = V2User(id=7004, cc_id="seg_test_7004", nickname="test_winner",
                      role=V2UserRole.USER, status=V2UserStatus.ACTIVE)
        db.add(user)
        db.flush()
        seg = V2UserSegment(user_id=7004, segment="COMMON")
        db.add(seg)
        db.commit()

        resp = test_client.patch(
            "/api/v2/admin/users/7004/segment",
            json={"segment": "WINNER"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["newSegment"] == "WINNER"


# ──────────────────────────────────────────────
# 3. pending_segment 자동적용 제거 검증
# ──────────────────────────────────────────────

class TestPendingSegmentProtection:
    """pending_segment가 자동적용되지 않고 어드민 설정이 보호되는지 검증."""

    def test_pending_segment_not_auto_applied(self, db: Session):
        """get_current_segment() 호출 시 pending_segment가 자동적용되지 않아야 한다."""
        user = V2User(id=7010, cc_id="seg_test_7010", nickname="test_no_auto",
                      role=V2UserRole.USER, status=V2UserStatus.ACTIVE)
        db.add(user)
        db.flush()
        # 어드민이 AT_RISK로 설정, HQ가 VIP를 pending으로 넣은 상태
        seg = V2UserSegment(user_id=7010, segment="AT_RISK", pending_segment="VIP")
        db.add(seg)
        db.commit()

        # API 호출 시점
        result = V2SegmentService.get_current_segment(db, 7010)
        assert result == "AT_RISK"  # 어드민 설정 유지

        # DB에서도 pending이 그대로 남아있어야 함 (배치에서만 처리)
        db.expire_all()
        seg_row = db.get(V2UserSegment, 7010)
        assert seg_row.segment == "AT_RISK"
        assert seg_row.pending_segment == "VIP"  # 건드리지 않음

    def test_admin_set_overrides_pending(self, db: Session, admin_token, test_client):
        """어드민이 세그먼트를 설정하면 pending_segment가 제거된다."""
        user = V2User(id=7011, cc_id="seg_test_7011", nickname="test_admin_override",
                      role=V2UserRole.USER, status=V2UserStatus.ACTIVE)
        db.add(user)
        db.flush()
        seg = V2UserSegment(user_id=7011, segment="COMMON", pending_segment="WHALE")
        db.add(seg)
        db.commit()

        # 어드민이 AT_RISK로 설정 → pending 제거
        resp = test_client.patch(
            "/api/v2/admin/users/7011/segment",
            json={"segment": "AT_RISK"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200

        # 이후 get_current_segment는 AT_RISK 반환
        result = V2SegmentService.get_current_segment(db, 7011)
        assert result == "AT_RISK"

        db.expire_all()
        seg_row = db.get(V2UserSegment, 7011)
        assert seg_row.pending_segment is None


# ──────────────────────────────────────────────
# 4. 전체 파이프라인 통합 검증
# ──────────────────────────────────────────────

class TestSegmentVaultPipeline:
    """어드민 설정 → segment_service → vault_service 조건 매핑 통합 테스트."""

    @pytest.mark.parametrize(
        "segment, expected_play, expected_spend, expected_deposit",
        [
            ("NEW", 5, 0, 10000),
            ("COMMON", 15, 5000, 10000),
            ("VIP", 10, 0, 100000),
            ("WHALE", 0, 0, 100000),
            ("AT_RISK", 30, 10000, 10000),
            ("WINNER", 30, 10000, 10000),
        ],
    )
    def test_db_segment_maps_to_correct_conditions(
        self, db: Session, segment, expected_play, expected_spend, expected_deposit
    ):
        """DB에 저장된 세그먼트가 vault 출금조건으로 정확히 매핑되는 통합 테스트."""
        uid = 8000 + hash(segment) % 100
        user = V2User(id=uid, cc_id=f"pipe_{segment}_{uid}", nickname=f"pipe_{segment}",
                      role=V2UserRole.USER, status=V2UserStatus.ACTIVE)
        db.add(user)
        db.flush()
        seg = V2UserSegment(user_id=uid, segment=segment)
        db.add(seg)
        db.commit()

        # segment_service에서 세그먼트 조회
        current = V2SegmentService.get_current_segment(db, uid)
        assert current == segment

        # vault_service에서 조건 매핑
        play, spend, deposit = V2VaultService._get_withdrawal_targets(current, 0)
        assert play == expected_play
        assert spend == expected_spend
        assert deposit == expected_deposit


class TestNormalizeSegment:
    """normalize_segment() 정규화 검증."""

    @pytest.mark.parametrize(
        "input_val, expected",
        [
            ("vip", "VIP"),
            ("  whale  ", "WHALE"),
            ("at_risk", "AT_RISK"),
            ("winner", "WINNER"),
            ("COMMON", "COMMON"),
            ("new", "NEW"),
            (None, "COMMON"),
            ("", "COMMON"),
            ("INVALID", "COMMON"),
        ],
    )
    def test_normalize(self, input_val, expected):
        assert V2SegmentService.normalize_segment(input_val) == expected
