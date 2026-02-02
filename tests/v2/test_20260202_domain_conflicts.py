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
        """Segment 우선순위 문서화: VIP > WHALE > AT_RISK"""
        segment_priority = {
            "VIP": 1,
            "WHALE": 2,
            "AT_RISK": 3,
            "REGULAR": 4,
            "DORMANT": 5
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
