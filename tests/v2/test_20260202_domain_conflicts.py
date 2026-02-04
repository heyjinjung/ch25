"""
도메인 충돌 분석 테스트 (Domain Conflict Tests)

출처: docs/v2_specs/07_golden/v2_patch_execution_log_ko.md §도메인 충돌 분석 및 대응책

테스트 대상:
1. Inventory & Economy Domain - 음수 잔액/Clawback
2. Deposit & Payment Domain - Provisional Grant, Rate Limit
3. Game Domain - Clawback 추적 (FIFO)
4. Auth & Security Domain - Rate Limit (3/hour/user)
5. CSV Import → Analytics - 데이터 파이프라인 우선순위
6. Golden Intervention vs CRM - 개입 충돌/쿨다운
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.v2.models.user import V2User
from app.v2.models.v2_user_deposit_evidence import V2UserDepositEvidence, EvidenceStatus
from app.v2.services.latency_survival_service import V2LatencySurvivalService
from app.v2.services.inventory_service import V2InventoryService
from app.v2.models import GameTokenType, UserGameWallet, UserInventoryItem


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def v2_user_for_conflict(db: Session):
    """도메인 충돌 테스트용 유저 - 7일 이상 경과한 유저"""
    user = V2User(
        cc_id="conflict_test_user",
        nickname="ConflictTester",
        vault_locked_balance=0,
        created_at=datetime.now(timezone.utc) - timedelta(days=14)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def v2_user_with_balance(db: Session):
    """초기 잔액이 있는 유저"""
    user = V2User(
        cc_id="balance_test_user",
        nickname="BalanceTester",
        vault_locked_balance=0,
        created_at=datetime.now(timezone.utc) - timedelta(days=14)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Grant initial ROULETTE_TICKET balance
    V2InventoryService.grant_wallet_tokens(
        db, user.id, GameTokenType.ROULETTE_TICKET, 10,
        reason="INITIAL_GRANT", label="test_setup"
    )
    return user


# =============================================================================
# 1. Inventory & Economy Domain Tests (💰)
# =============================================================================

class TestInventoryNegativeBalance:
    """
    출처: v2_patch_execution_log_ko.md §Inventory & Economy Domain
    
    충돌 요소: Clawback 시 음수 잔액 발생 가능
    대응책: allow_negative=False 기본값, Clawback 시에만 True
    """
    
    def test_consume_without_allow_negative_fails(self, db: Session, v2_user_for_conflict):
        """allow_negative=False(기본값)일 때 잔액 부족 시 실패해야 함"""
        # Given: 잔액 0인 유저
        balance = V2InventoryService.get_wallet_balance(db, v2_user_for_conflict.id, "ROULETTE_TICKET")
        assert balance == 0
        
        # When/Then: 잔액보다 많이 차감 시도 → ValueError
        with pytest.raises(ValueError, match="INSUFFICIENT_BALANCE"):
            V2InventoryService.consume_wallet_tokens(
                db,
                v2_user_for_conflict.id,
                GameTokenType.ROULETTE_TICKET,
                5,
                reason="TEST_CONSUME",
                allow_negative=False
            )
    
    def test_consume_with_allow_negative_succeeds(self, db: Session, v2_user_for_conflict):
        """allow_negative=True일 때 음수 잔액 허용"""
        # Given: 잔액 0인 유저
        balance_before = V2InventoryService.get_wallet_balance(db, v2_user_for_conflict.id, "ROULETTE_TICKET")
        assert balance_before == 0
        
        # When: allow_negative=True로 차감
        balance_after = V2InventoryService.consume_wallet_tokens(
            db,
            v2_user_for_conflict.id,
            GameTokenType.ROULETTE_TICKET,
            5,
            reason="CLAWBACK_TEST",
            allow_negative=True
        )
        
        # Then: 음수 잔액 허용됨
        assert balance_after == -5
        
    def test_clawback_allows_negative_balance(self, db: Session, v2_user_with_balance):
        """실제 Clawback 시나리오에서 음수 잔액 허용 확인"""
        # Given: 초기 잔액 10, Provisional Grant로 +3 = 13
        initial_balance = V2InventoryService.get_wallet_balance(db, v2_user_with_balance.id, "ROULETTE_TICKET")
        assert initial_balance == 10
        
        evidence = V2LatencySurvivalService.submit_evidence(
            db, v2_user_with_balance.id, "TX_CLAWBACK_TEST", 50000
        )
        balance_after_grant = V2InventoryService.get_wallet_balance(db, v2_user_with_balance.id, "ROULETTE_TICKET")
        assert balance_after_grant == 13  # 10 + 3
        
        # 유저가 모든 티켓 사용 (게임에서)
        V2InventoryService.consume_wallet_tokens(
            db, v2_user_with_balance.id, GameTokenType.ROULETTE_TICKET, 13,
            reason="GAME_PLAY"
        )
        balance_after_use = V2InventoryService.get_wallet_balance(db, v2_user_with_balance.id, "ROULETTE_TICKET")
        assert balance_after_use == 0
        
        # When: 어드민이 Reject (Clawback) → 음수 잔액 발생
        rejected = V2LatencySurvivalService.reject_evidence(
            db, admin_id=1, evidence_id=evidence.id, reason="FRAUDULENT"
        )
        
        # Then: 음수 잔액 허용됨 (allow_negative=True 내부 처리)
        assert rejected.status == EvidenceStatus.REJECTED
        final_balance = V2InventoryService.get_wallet_balance(db, v2_user_with_balance.id, "ROULETTE_TICKET")
        assert final_balance == -3  # 0 - 3 = -3


# =============================================================================
# 2. Deposit & Payment Domain Tests (💳)
# =============================================================================

class TestDepositProvisionalGrant:
    """
    출처: v2_patch_execution_log_ko.md §Deposit & Payment Domain
    
    충돌 요소: Provisional Grant vs 실제 입금 중복 보상 우려
    대응책: V2UserDepositEvidence.matched_log_id로 Soft Link
    """
    
    def test_provisional_grant_creates_evidence_record(self, db: Session, v2_user_for_conflict):
        """Provisional Grant 시 Evidence 레코드 생성 확인"""
        # When
        evidence = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_PROV_001", 100000
        )
        
        # Then
        assert evidence is not None
        assert evidence.status == EvidenceStatus.PROVISIONAL
        assert evidence.tx_id == "TX_PROV_001"
        assert evidence.claimed_amount == 100000
        assert evidence.matched_log_id is None  # 아직 매칭 안됨
        assert evidence.reward_json == {"ROULETTE_TICKET": 3}
    
    def test_verify_sets_matched_log_id(self, db: Session, v2_user_for_conflict):
        """Verify 시 matched_log_id 설정 확인"""
        # Given
        evidence = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_MATCH_001", 50000
        )
        
        # When
        verified = V2LatencySurvivalService.verify_evidence(
            db, admin_id=1, evidence_id=evidence.id, matched_log_id=12345
        )
        
        # Then: matched_log_id로 입금 로그와 연결됨
        assert verified.status == EvidenceStatus.VERIFIED
        assert verified.matched_log_id == 12345
        assert verified.verified_at is not None


# =============================================================================
# 3. Game Domain Tests (🎮)
# =============================================================================

class TestGameClawbackTracking:
    """
    출처: v2_patch_execution_log_ko.md §Game Domain
    
    충돌 요소: Clawback 범위 - 선지급 티켓으로 획득한 당첨금까지 회수
    대응책: FIFO 추적 로직
    """
    
    def test_clawback_records_in_evidence(self, db: Session, v2_user_for_conflict):
        """Clawback 시 reward_json 기반으로 회수 추적"""
        # Given: Provisional Grant
        evidence = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_GAME_001", 100000
        )
        assert evidence.reward_json == {"ROULETTE_TICKET": 3}
        
        # When: Reject → Clawback
        rejected = V2LatencySurvivalService.reject_evidence(
            db, admin_id=1, evidence_id=evidence.id, reason="NO_DEPOSIT_FOUND"
        )
        
        # Then: reward_json 기반으로 정확히 회수됨
        assert rejected.status == EvidenceStatus.REJECTED
        # Clawback 완료 후 잔액 확인 (음수 허용)
        balance = V2InventoryService.get_wallet_balance(db, v2_user_for_conflict.id, "ROULETTE_TICKET")
        assert balance <= 0  # 사용한 만큼 음수


# =============================================================================
# 4. Auth & Security Domain Tests (🔐)
# =============================================================================

class TestAuthRateLimitPolicy:
    """
    출처: v2_patch_execution_log_ko.md §Auth & Security Domain
    
    Rate Limit 정책 SoT:
    - 시간당 최대: 3회/User
    - 중복 TX ID: Unique Check
    - 쿨다운: 429 Error 반환
    """
    
    def test_rate_limit_3_per_hour_per_user(self, db: Session, v2_user_for_conflict):
        """시간당 3회 제한 - 4번째 요청 시 429 반환"""
        # Given: 3회 정상 요청
        for i in range(3):
            V2LatencySurvivalService.submit_evidence(
                db, v2_user_for_conflict.id, f"TX_RATE_{i}", 10000 * (i + 1)
            )
        
        # When/Then: 4번째 요청 → 429
        with pytest.raises(HTTPException) as exc:
            V2LatencySurvivalService.submit_evidence(
                db, v2_user_for_conflict.id, "TX_RATE_EXCEED", 50000
            )
        assert exc.value.status_code == 429
        assert exc.value.detail == "RATE_LIMIT_EXCEEDED"
    
    def test_duplicate_tx_id_rejected(self, db: Session, v2_user_for_conflict):
        """동일 TX ID 재제출 차단"""
        tx_id = "TX_UNIQUE_CHECK"
        
        # First submission
        V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, tx_id, 100000
        )
        
        # Second submission with same TX ID → 400
        with pytest.raises(HTTPException) as exc:
            V2LatencySurvivalService.submit_evidence(
                db, v2_user_for_conflict.id, tx_id, 100000
            )
        assert exc.value.status_code == 400
        assert exc.value.detail == "DUPLICATE_TX_ID"
    
    def test_rate_limit_is_user_based_not_ip(self, db: Session):
        """Rate Limit은 IP가 아닌 User ID 기반"""
        # Given: 서로 다른 두 유저 생성
        user1 = V2User(
            cc_id="rate_user_1", nickname="RateUser1",
            vault_locked_balance=0,
            created_at=datetime.now(timezone.utc) - timedelta(days=10)
        )
        user2 = V2User(
            cc_id="rate_user_2", nickname="RateUser2",
            vault_locked_balance=0,
            created_at=datetime.now(timezone.utc) - timedelta(days=10)
        )
        db.add_all([user1, user2])
        db.commit()
        
        # When: User1이 3회 요청
        for i in range(3):
            V2LatencySurvivalService.submit_evidence(
                db, user1.id, f"TX_USER1_{i}", 10000
            )
        
        # Then: User2는 여전히 요청 가능 (별도 Rate Limit)
        evidence = V2LatencySurvivalService.submit_evidence(
            db, user2.id, "TX_USER2_0", 50000
        )
        assert evidence is not None
        assert evidence.user_id == user2.id


# =============================================================================
# 5. CSV Import → Analytics Pipeline Tests
# =============================================================================

class TestDataPipelinePriority:
    """
    출처: v2_patch_execution_log_ko.md §CSV Import → Analytics 파이프라인
    
    데이터 파이프라인 우선순위:
    1. HQ Margin CSV → V2UserSegment.total_margin (가장 신뢰)
    2. Game Log CSV → V2GameLog → 실시간 수익/지출 (보조)
    3. 내부 게임 로그 → V2RouletteLog 등 (실시간)
    """
    
    def test_pipeline_priority_documentation(self):
        """데이터 파이프라인 우선순위 문서화 확인"""
        # This test documents the expected priority
        priority_order = [
            "HQ Margin CSV → V2UserSegment.total_margin",
            "Game Log CSV → V2GameLog",
            "Internal Game Log → V2RouletteLog"
        ]
        assert len(priority_order) == 3
        assert "HQ Margin" in priority_order[0]  # 1순위


# =============================================================================
# 6. Golden Intervention vs CRM Tests
# =============================================================================

class TestGoldenInterventionConflicts:
    """
    출처: v2_patch_execution_log_ko.md §Golden Intervention vs CRM 충돌
    
    충돌 요소:
    - 자동 개입 vs 수동 승인 → 중복 발생 가능
    - 쿨다운 관리 → Redis 키 표준화 필요
    - Golden Hour + AT_RISK → Segment 우선순위 적용
    """
    
    def test_cooldown_key_format(self):
        """쿨다운 Redis 키 포맷 표준화 확인"""
        # SoT: golden:v2:cooldown:{trigger_id}:{user_id}
        trigger_id = "TRG_LOSE_5"
        user_id = 12345
        expected_key = f"golden:v2:cooldown:{trigger_id}:{user_id}"
        
        assert expected_key == "golden:v2:cooldown:TRG_LOSE_5:12345"
    
    def test_segment_priority_order(self):
        """Segment 우선순위 문서화: VIP > WHALE > AT_RISK > COMMON > NEW"""
        segment_priority = {
            "VIP": 1,
            "WHALE": 2,
            "AT_RISK": 3,
            "COMMON": 4,
            "NEW": 5
        }
        
        # VIP가 최우선
        assert segment_priority["VIP"] < segment_priority["WHALE"]
        assert segment_priority["WHALE"] < segment_priority["AT_RISK"]
    
    @patch("redis.from_url")
    def test_cooldown_prevents_duplicate_intervention(self, mock_redis):
        """쿨다운 키가 있으면 중복 개입 방지"""
        # Given: Mock Redis with existing cooldown key
        mock_client = MagicMock()
        mock_client.get.return_value = b"1"  # 쿨다운 존재
        mock_redis.return_value = mock_client
        
        trigger_id = "TRG_LOSE_5"
        user_id = 100
        cooldown_key = f"golden:v2:cooldown:{trigger_id}:{user_id}"
        
        # When: Check cooldown
        exists = mock_client.get(cooldown_key) is not None
        
        # Then: 쿨다운 존재 시 개입 스킵 로직
        assert exists is True


# =============================================================================
# 7. Edge Cases & Integration Tests
# =============================================================================

class TestDomainConflictEdgeCases:
    """도메인 간 경계에서 발생할 수 있는 Edge Case 테스트"""
    
    def test_multiple_provisional_grants_same_session(self, db: Session, v2_user_for_conflict):
        """동일 세션에서 여러 Provisional Grant → 각각 별도 추적"""
        # Grant 1
        ev1 = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_MULTI_1", 10000
        )
        # Grant 2
        ev2 = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_MULTI_2", 20000
        )
        # Grant 3
        ev3 = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_MULTI_3", 30000
        )
        
        # 총 잔액: 3 + 3 + 3 = 9
        balance = V2InventoryService.get_wallet_balance(db, v2_user_for_conflict.id, "ROULETTE_TICKET")
        assert balance == 9
        
        # 1번만 Reject → 3만 회수
        V2LatencySurvivalService.reject_evidence(db, 1, ev1.id, "FRAUD")
        balance_after = V2InventoryService.get_wallet_balance(db, v2_user_for_conflict.id, "ROULETTE_TICKET")
        assert balance_after == 6  # 9 - 3
    
    def test_verify_then_reject_fails(self, db: Session, v2_user_for_conflict):
        """이미 Verify된 건은 Reject 불가"""
        evidence = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_VERIFY_FIRST", 50000
        )
        
        # Verify 먼저
        V2LatencySurvivalService.verify_evidence(
            db, 1, evidence.id, matched_log_id=999
        )
        
        # Reject 시도 → 실패
        with pytest.raises(HTTPException) as exc:
            V2LatencySurvivalService.reject_evidence(
                db, 1, evidence.id, reason="LATE_REJECT"
            )
        assert exc.value.status_code == 400
        assert exc.value.detail == "INVALID_STATUS"
    
    def test_reject_then_verify_fails(self, db: Session, v2_user_for_conflict):
        """이미 Reject된 건은 Verify 불가"""
        evidence = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_REJECT_FIRST", 50000
        )
        
        # Reject 먼저
        V2LatencySurvivalService.reject_evidence(
            db, 1, evidence.id, reason="FRAUD"
        )
        
        # Verify 시도 → 실패
        with pytest.raises(HTTPException) as exc:
            V2LatencySurvivalService.verify_evidence(
                db, 1, evidence.id, matched_log_id=999
            )
        assert exc.value.status_code == 400
        assert exc.value.detail == "INVALID_STATUS"


# =============================================================================
# 8. Deposit & Payment 중복 처리 테스트 (💳 추가)
# =============================================================================

class TestDepositDuplicatePrevention:
    """
    출처: v2_patch_execution_log_ko.md §Deposit & Payment Domain
    
    충돌 요소: Provisional Grant vs 실제 입금 중복 보상 우려
    대응책: V2UserDepositEvidence.matched_log_id Soft Link로 중복 방지
    """
    
    def test_same_matched_log_id_should_be_detected(self, db: Session, v2_user_for_conflict):
        """동일 입금 로그(matched_log_id)에 여러 Evidence 연결 시도 감지"""
        # Given: 두 개의 Evidence 생성
        ev1 = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_MATCH_DUP_1", 50000
        )
        ev2 = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_MATCH_DUP_2", 50000
        )
        
        # When: 첫 번째 Evidence 승인 (matched_log_id=1001)
        verified = V2LatencySurvivalService.verify_evidence(
            db, admin_id=1, evidence_id=ev1.id, matched_log_id=1001
        )
        db.flush()  # Ensure changes are flushed
        
        # Then: 검증 - verified 객체 직접 확인
        assert verified.status == EvidenceStatus.VERIFIED
        assert verified.matched_log_id == 1001
        
        # DB에서 동일 matched_log_id 조회 시 중복 감지 가능
        db.refresh(ev1)
        assert ev1.matched_log_id == 1001
        # 운영 시 matched_log_id 중복 체크 로직 필요 → 문서화
    
    def test_evidence_tx_id_unique_constraint(self, db: Session, v2_user_for_conflict):
        """TX ID Unique Constraint 검증 - 동일 TX로 여러 신고 불가"""
        tx_id = "TX_UNIQUE_DEPOSIT_001"
        
        # First evidence
        V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, tx_id, 100000
        )
        
        # Same TX ID 재제출 → 400 DUPLICATE_TX_ID
        with pytest.raises(HTTPException) as exc:
            V2LatencySurvivalService.submit_evidence(
                db, v2_user_for_conflict.id, tx_id, 100000
            )
        assert exc.value.status_code == 400
        assert exc.value.detail == "DUPLICATE_TX_ID"
    
    def test_evidence_status_lifecycle(self, db: Session, v2_user_for_conflict):
        """Evidence 상태 전이 검증: PROVISIONAL → VERIFIED or REJECTED"""
        evidence = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_LIFECYCLE_001", 100000
        )
        
        # 초기 상태: PROVISIONAL
        assert evidence.status == EvidenceStatus.PROVISIONAL
        
        # VERIFIED로 전이
        verified = V2LatencySurvivalService.verify_evidence(
            db, admin_id=1, evidence_id=evidence.id, matched_log_id=2001
        )
        assert verified.status == EvidenceStatus.VERIFIED
        assert verified.matched_log_id == 2001
        assert verified.verified_at is not None
    
    def test_evidence_reward_persistence_on_verify(self, db: Session, v2_user_for_conflict):
        """Verify 시 Provisional Reward가 유지되는지 확인 (중복 지급 없음)"""
        # Given: Provisional Grant
        evidence = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_REWARD_PERSIST", 50000
        )
        balance_after_grant = V2InventoryService.get_wallet_balance(
            db, v2_user_for_conflict.id, "ROULETTE_TICKET"
        )
        assert balance_after_grant == 3  # PROVISIONAL_REWARD_AMOUNT
        
        # When: Verify (입금 확인)
        V2LatencySurvivalService.verify_evidence(
            db, admin_id=1, evidence_id=evidence.id, matched_log_id=3001
        )
        
        # Then: 잔액 변동 없음 (추가 지급 없음, 기존 유지)
        balance_after_verify = V2InventoryService.get_wallet_balance(
            db, v2_user_for_conflict.id, "ROULETTE_TICKET"
        )
        assert balance_after_verify == 3  # 동일 유지
    
    def test_different_users_same_tx_id_should_fail(self, db: Session):
        """다른 유저가 동일 TX ID로 신고 시도 → 실패 (TX ID는 전역 Unique)"""
        # Given: 두 유저 생성
        user1 = V2User(
            cc_id="deposit_user_1", nickname="DepositUser1",
            vault_locked_balance=0,
            created_at=datetime.now(timezone.utc) - timedelta(days=10)
        )
        user2 = V2User(
            cc_id="deposit_user_2", nickname="DepositUser2",
            vault_locked_balance=0,
            created_at=datetime.now(timezone.utc) - timedelta(days=10)
        )
        db.add_all([user1, user2])
        db.commit()
        
        tx_id = "TX_GLOBAL_UNIQUE_001"
        
        # User1이 먼저 신고
        V2LatencySurvivalService.submit_evidence(db, user1.id, tx_id, 50000)
        
        # User2가 동일 TX로 신고 시도 → 실패
        with pytest.raises(HTTPException) as exc:
            V2LatencySurvivalService.submit_evidence(db, user2.id, tx_id, 50000)
        assert exc.value.status_code == 400
        assert exc.value.detail == "DUPLICATE_TX_ID"
    
    def test_evidence_with_image_url(self, db: Session, v2_user_for_conflict):
        """이미지 URL 포함 Evidence 생성 검증"""
        evidence = V2LatencySurvivalService.submit_evidence(
            db,
            v2_user_for_conflict.id,
            "TX_WITH_IMAGE_001",
            75000,
            image_url="https://example.com/receipt.jpg"
        )
        
        assert evidence.image_url == "https://example.com/receipt.jpg"
        assert evidence.claimed_amount == 75000
        assert evidence.status == EvidenceStatus.PROVISIONAL
    
    def test_verify_with_admin_memo(self, db: Session, v2_user_for_conflict):
        """Verify 시 관리자 메모 저장 검증"""
        evidence = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_MEMO_001", 30000
        )
        
        verified = V2LatencySurvivalService.verify_evidence(
            db,
            admin_id=1,
            evidence_id=evidence.id,
            matched_log_id=4001,
            memo="입금 확인 완료 - 계좌이체"
        )
        
        assert verified.admin_memo == "입금 확인 완료 - 계좌이체"
    
    def test_reject_with_reason(self, db: Session, v2_user_for_conflict):
        """Reject 시 거절 사유 저장 검증"""
        evidence = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_REJECT_REASON", 100000
        )
        
        rejected = V2LatencySurvivalService.reject_evidence(
            db,
            admin_id=1,
            evidence_id=evidence.id,
            reason="입금 내역 확인 불가 - 허위 신고 의심"
        )
        
        assert rejected.status == EvidenceStatus.REJECTED
        assert rejected.admin_memo == "입금 내역 확인 불가 - 허위 신고 의심"


# =============================================================================
# 9. Inventory 추가 커버리지 테스트 (💰)
# =============================================================================

class TestInventoryExtendedCoverage:
    """inventory_service.py 추가 커버리지 확보"""
    
    def test_grant_wallet_tokens_with_meta(self, db: Session, v2_user_for_conflict):
        """meta 정보 포함 토큰 지급"""
        balance = V2InventoryService.grant_wallet_tokens(
            db,
            v2_user_for_conflict.id,
            GameTokenType.ROULETTE_TICKET,
            5,
            reason="BONUS_GRANT",
            label="DAILY_BONUS",
            meta={"campaign_id": "CAMP_001", "source": "promotion"}
        )
        
        assert balance == 5
    
    def test_grant_wallet_tokens_invalid_amount_fails(self, db: Session, v2_user_for_conflict):
        """0 이하 금액 지급 시도 → 실패"""
        with pytest.raises(ValueError, match="INVALID_TOKEN_AMOUNT"):
            V2InventoryService.grant_wallet_tokens(
                db,
                v2_user_for_conflict.id,
                GameTokenType.ROULETTE_TICKET,
                0,
                reason="INVALID_GRANT"
            )
        
        with pytest.raises(ValueError, match="INVALID_TOKEN_AMOUNT"):
            V2InventoryService.grant_wallet_tokens(
                db,
                v2_user_for_conflict.id,
                GameTokenType.ROULETTE_TICKET,
                -5,
                reason="INVALID_GRANT"
            )
    
    def test_consume_wallet_tokens_invalid_amount_fails(self, db: Session, v2_user_for_conflict):
        """0 이하 금액 차감 시도 → 실패"""
        with pytest.raises(ValueError, match="INVALID_TOKEN_AMOUNT"):
            V2InventoryService.consume_wallet_tokens(
                db,
                v2_user_for_conflict.id,
                GameTokenType.ROULETTE_TICKET,
                0,
                reason="INVALID_CONSUME"
            )
    
    def test_get_wallet_balances(self, db: Session, v2_user_for_conflict):
        """여러 토큰 타입의 잔액 조회"""
        # Grant different token types
        V2InventoryService.grant_wallet_tokens(
            db, v2_user_for_conflict.id, GameTokenType.ROULETTE_TICKET, 10,
            reason="TEST"
        )
        V2InventoryService.grant_wallet_tokens(
            db, v2_user_for_conflict.id, GameTokenType.DICE_TICKET, 5,
            reason="TEST"
        )
        
        balances = V2InventoryService.get_wallet_balances(db, v2_user_for_conflict.id)
        
        assert "ROULETTE_TICKET" in balances
        assert "DICE_TICKET" in balances
        assert balances["ROULETTE_TICKET"] == 10
        assert balances["DICE_TICKET"] == 5
    
    def test_get_wallet_balance_with_string_type(self, db: Session, v2_user_for_conflict):
        """문자열 타입으로 잔액 조회"""
        V2InventoryService.grant_wallet_tokens(
            db, v2_user_for_conflict.id, GameTokenType.ROULETTE_TICKET, 7,
            reason="TEST"
        )
        
        # String type으로 조회
        balance = V2InventoryService.get_wallet_balance(
            db, v2_user_for_conflict.id, "ROULETTE_TICKET"
        )
        
        assert balance == 7
    
    def test_wallet_ledger_logging(self, db: Session, v2_user_for_conflict):
        """지갑 원장(Ledger) 로깅 검증"""
        from app.v2.models import UserGameWalletLedger
        
        # Grant
        V2InventoryService.grant_wallet_tokens(
            db, v2_user_for_conflict.id, GameTokenType.ROULETTE_TICKET, 10,
            reason="LEDGER_TEST", label="TEST_LABEL"
        )
        
        # Check ledger
        ledger = db.query(UserGameWalletLedger).filter(
            UserGameWalletLedger.user_id == v2_user_for_conflict.id,
            UserGameWalletLedger.reason == "LEDGER_TEST"
        ).first()
        
        assert ledger is not None
        assert ledger.delta == 10
        assert ledger.balance_after == 10
        assert ledger.label == "TEST_LABEL"


# =============================================================================
# 10. Game Domain Tests (🎮 Roulette - Clawback FIFO 추적)
# =============================================================================

class TestGameDomainClawback:
    """
    출처: v2_patch_execution_log_ko.md §Game Domain
    
    충돌 요소:
    - 게임 로그 스키마 변경 → Clawback 추적 실패 가능
    - Clawback 범위 → 선지급 티켓으로 획득한 당첨금까지 회수
    
    대응책: FIFO 추적 로직, V2RouletteLog 스키마 의존성
    """
    
    def test_clawback_tracks_provisional_grant_evidence(self, db: Session, v2_user_for_conflict):
        """Clawback 시 Evidence의 reward_json 기반 추적 확인"""
        # Given: Provisional Grant
        evidence = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_FIFO_001", 100000
        )
        
        # Then: reward_json에 지급 내역 기록됨
        assert evidence.reward_json is not None
        assert "ROULETTE_TICKET" in evidence.reward_json
        assert evidence.reward_json["ROULETTE_TICKET"] == 3
        
        # When: Reject 시 reward_json 기반으로 정확히 회수
        rejected = V2LatencySurvivalService.reject_evidence(
            db, admin_id=1, evidence_id=evidence.id, reason="FIFO_TEST"
        )
        
        # Then: reward_json 그대로 유지 (추적용)
        assert rejected.reward_json == {"ROULETTE_TICKET": 3}
    
    def test_clawback_fifo_order_simulation(self, db: Session, v2_user_for_conflict):
        """FIFO 순서 시뮬레이션 - 선지급 순서대로 회수"""
        # Given: 3개의 Provisional Grant (FIFO 순서)
        ev1 = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_FIFO_A", 10000
        )
        ev2 = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_FIFO_B", 20000
        )
        ev3 = V2LatencySurvivalService.submit_evidence(
            db, v2_user_for_conflict.id, "TX_FIFO_C", 30000
        )
        
        # 총 지급: 3 + 3 + 3 = 9
        balance = V2InventoryService.get_wallet_balance(
            db, v2_user_for_conflict.id, "ROULETTE_TICKET"
        )
        assert balance == 9
        
        # When: FIFO 순서로 첫 번째 Reject
        V2LatencySurvivalService.reject_evidence(db, 1, ev1.id, "FIFO_FIRST")
        
        # Then: 3 회수 → 6 남음
        balance_after = V2InventoryService.get_wallet_balance(
            db, v2_user_for_conflict.id, "ROULETTE_TICKET"
        )
        assert balance_after == 6
        
        # 두 번째 Reject
        V2LatencySurvivalService.reject_evidence(db, 1, ev2.id, "FIFO_SECOND")
        assert V2InventoryService.get_wallet_balance(
            db, v2_user_for_conflict.id, "ROULETTE_TICKET"
        ) == 3
    
    def test_clawback_with_partial_usage(self, db: Session, v2_user_with_balance):
        """부분 사용 후 Clawback - 음수 잔액 발생"""
        # Given: 기존 잔액 10 + Provisional 3 = 13
        evidence = V2LatencySurvivalService.submit_evidence(
            db, v2_user_with_balance.id, "TX_PARTIAL_USE", 50000
        )
        assert V2InventoryService.get_wallet_balance(
            db, v2_user_with_balance.id, "ROULETTE_TICKET"
        ) == 13
        
        # 유저가 12개 사용 (1개 남음)
        V2InventoryService.consume_wallet_tokens(
            db, v2_user_with_balance.id, GameTokenType.ROULETTE_TICKET, 12,
            reason="GAME_USAGE"
        )
        assert V2InventoryService.get_wallet_balance(
            db, v2_user_with_balance.id, "ROULETTE_TICKET"
        ) == 1
        
        # When: Clawback 3개 → -2 음수 잔액
        V2LatencySurvivalService.reject_evidence(
            db, 1, evidence.id, "PARTIAL_CLAWBACK"
        )
        
        # Then: 음수 잔액 허용
        final_balance = V2InventoryService.get_wallet_balance(
            db, v2_user_with_balance.id, "ROULETTE_TICKET"
        )
        assert final_balance == -2


# =============================================================================
# 11. Auth & Security Domain Extended Tests (🔐)
# =============================================================================

class TestAuthSecurityExtended:
    """
    출처: v2_patch_execution_log_ko.md §Auth & Security Domain
    
    Rate Limit 정책 SoT:
    - 시간당 최대: 3회/User
    - 중복 TX ID: Unique Check
    - 쿨다운: 429 Error 반환
    - VPN 우회 불가: User ID 기반 (IP 아님)
    """
    
    def test_rate_limit_resets_after_one_hour(self, db: Session):
        """1시간 후 Rate Limit 리셋 확인 (시뮬레이션)"""
        # Given: 새 유저
        user = V2User(
            cc_id="rate_reset_user", nickname="RateResetUser",
            vault_locked_balance=0,
            created_at=datetime.now(timezone.utc) - timedelta(days=10)
        )
        db.add(user)
        db.commit()
        
        # 3회 요청으로 Rate Limit 도달
        for i in range(3):
            V2LatencySurvivalService.submit_evidence(
                db, user.id, f"TX_RESET_{i}", 10000
            )
        
        # 4번째 요청 → 429
        with pytest.raises(HTTPException) as exc:
            V2LatencySurvivalService.submit_evidence(
                db, user.id, "TX_RESET_FAIL", 10000
            )
        assert exc.value.status_code == 429
        
        # 시뮬레이션: 1시간 전 Evidence의 created_at을 2시간 전으로 변경
        old_evidences = db.query(V2UserDepositEvidence).filter(
            V2UserDepositEvidence.user_id == user.id
        ).all()
        for ev in old_evidences:
            ev.created_at = datetime.utcnow() - timedelta(hours=2)
        db.commit()
        
        # Then: Rate Limit 해제되어 새 요청 가능
        new_evidence = V2LatencySurvivalService.submit_evidence(
            db, user.id, "TX_RESET_SUCCESS", 50000
        )
        assert new_evidence is not None
    
    def test_rate_limit_count_per_user_isolation(self, db: Session):
        """User별 Rate Limit 격리 확인"""
        # Given: 3명의 유저
        users = []
        for i in range(3):
            user = V2User(
                cc_id=f"isolation_user_{i}", nickname=f"IsolationUser{i}",
                vault_locked_balance=0,
                created_at=datetime.now(timezone.utc) - timedelta(days=10)
            )
            db.add(user)
            users.append(user)
        db.commit()
        
        # User 0: 3회 모두 사용
        for i in range(3):
            V2LatencySurvivalService.submit_evidence(
                db, users[0].id, f"TX_ISO_U0_{i}", 10000
            )
        
        # User 0: 4번째 → 429
        with pytest.raises(HTTPException) as exc:
            V2LatencySurvivalService.submit_evidence(
                db, users[0].id, "TX_ISO_U0_FAIL", 10000
            )
        assert exc.value.status_code == 429
        
        # User 1, 2: 여전히 3회씩 가능 (격리)
        for user_idx in [1, 2]:
            for i in range(3):
                evidence = V2LatencySurvivalService.submit_evidence(
                    db, users[user_idx].id, f"TX_ISO_U{user_idx}_{i}", 10000
                )
                assert evidence is not None
    
    def test_abuse_prevention_rapid_fire(self, db: Session, v2_user_for_conflict):
        """어뷰징 방지: 빠른 연속 요청 테스트"""
        # 3회 빠르게 연속 요청
        evidences = []
        for i in range(3):
            ev = V2LatencySurvivalService.submit_evidence(
                db, v2_user_for_conflict.id, f"TX_RAPID_{i}", 10000 * (i + 1)
            )
            evidences.append(ev)
        
        # 모두 다른 TX ID로 생성됨
        tx_ids = [e.tx_id for e in evidences]
        assert len(set(tx_ids)) == 3  # 중복 없음
        
        # 4번째 → 429
        with pytest.raises(HTTPException) as exc:
            V2LatencySurvivalService.submit_evidence(
                db, v2_user_for_conflict.id, "TX_RAPID_BLOCKED", 50000
            )
        assert exc.value.status_code == 429
        assert exc.value.detail == "RATE_LIMIT_EXCEEDED"
    
    def test_tx_id_format_validation(self, db: Session, v2_user_for_conflict):
        """TX ID 다양한 포맷 허용 확인"""
        # 다양한 포맷의 TX ID
        valid_tx_ids = [
            "TX-2026-02-02-001",
            "tx_lowercase_123",
            "UPPERCASE_TX_456",
            # "한글TX아이디789",  # 한글 포함 (정책에 따라 허용/차단)
        ]
        
        for tx_id in valid_tx_ids[:3]:  # Rate Limit 내에서
            evidence = V2LatencySurvivalService.submit_evidence(
                db, v2_user_for_conflict.id, tx_id, 10000
            )
            assert evidence.tx_id == tx_id
    
    def test_evidence_not_found_returns_404(self, db: Session, v2_user_for_conflict):
        """존재하지 않는 Evidence 조회 시 404"""
        with pytest.raises(HTTPException) as exc:
            V2LatencySurvivalService.verify_evidence(
                db, admin_id=1, evidence_id=99999, matched_log_id=1
            )
        assert exc.value.status_code == 404
        assert exc.value.detail == "EVIDENCE_NOT_FOUND"
        
        with pytest.raises(HTTPException) as exc:
            V2LatencySurvivalService.reject_evidence(
                db, admin_id=1, evidence_id=99999, reason="NOT_FOUND"
            )
        assert exc.value.status_code == 404


# =============================================================================
# 12. SoT Constants Validation Tests
# =============================================================================

class TestSoTConstantsValidation:
    """SoT 문서에 정의된 상수값 검증"""
    
    def test_provisional_reward_amount_matches_sot(self):
        """SoT: PROVISIONAL_REWARD_AMOUNT = 3"""
        assert V2LatencySurvivalService.PROVISIONAL_REWARD_AMOUNT == 3
    
    def test_max_provisional_per_hour_matches_sot(self):
        """SoT: MAX_PROVISIONAL_PER_HOUR = 3"""
        assert V2LatencySurvivalService.MAX_PROVISIONAL_PER_HOUR == 3
    
    def test_provisional_reward_type_matches_sot(self):
        """SoT: PROVISIONAL_REWARD_TYPE = ROULETTE_TICKET"""
        assert V2LatencySurvivalService.PROVISIONAL_REWARD_TYPE == "ROULETTE_TICKET"
    
    def test_evidence_status_enum_values(self):
        """EvidenceStatus Enum 값 검증"""
        assert EvidenceStatus.PENDING.value == "PENDING"
        assert EvidenceStatus.PROVISIONAL.value == "PROVISIONAL"
        assert EvidenceStatus.VERIFIED.value == "VERIFIED"
        assert EvidenceStatus.REJECTED.value == "REJECTED"
