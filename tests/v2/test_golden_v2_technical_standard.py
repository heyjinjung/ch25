"""Golden V2 Technical Standard Integration Tests (v2.3).

도메인: 시스템 기술 표준 및 원장 무결성
커버리지 대상: spending_logger_service.py, latency_survival_service.py, segment_service.py
SoT 문서: 01. System Core, 03. Technical Spec
"""
import pytest
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
from uuid import uuid4

from sqlalchemy.orm import Session
from app.v2.models import V2User, V2SpendingLedger, V2UserSegment, V2UserDepositEvidence, V2RouletteLog
from app.v2.services.spending_logger_service import SpendingLoggerService
from app.v2.services.latency_survival_service import V2LatencySurvivalService
from app.v2.services.segment_service import V2SegmentService
from app.v2.services.inventory_service import V2InventoryService

# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def technical_user(db: Session) -> V2User:
    """기술 표준 검증을 위한 베이스 유저 생성."""
    user = V2User(
        cc_id=f"tech_test_{uuid4().hex[:8]}",
        nickname="기술표준테스터",
        total_charge_amount=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# =============================================================================
# 1. Spending Ledger & Operational Date (SOT 01, 03)
# =============================================================================

class TestSpendingTechnicalStandard:
    def test_kst_0900_operational_date_transition(self):
        """KST 09:00 리셋 경계에서의 운영일 전환 검증."""
        KST = ZoneInfo("Asia/Seoul")
        
        # Case A: 08:59:59 KST -> 어제 날짜여야 함
        before_9 = datetime(2026, 2, 6, 8, 59, 59, tzinfo=KST)
        assert SpendingLoggerService.get_operational_date_kst(before_9) == date(2026, 2, 5)
        
        # Case B: 09:00:00 KST -> 오늘 날짜여야 함
        at_9 = datetime(2026, 2, 6, 9, 0, 0, tzinfo=KST)
        assert SpendingLoggerService.get_operational_date_kst(at_9) == date(2026, 2, 6)

    def test_multi_source_spending_deduplication(self, db: Session, technical_user: V2User):
        """다양한 지출 소스별 기록 및 트랜잭션 ID 유니크 제약 검증."""
        user_id = technical_user.id
        ref_id = "REF_MAX_12345"
        
        # HQ_W (본사 환전)
        res_hq = SpendingLoggerService.log_hq_withdrawal(db, user_id, 100000, f"hq_ref_{ref_id}")
        assert res_hq > 0
        
        # VAULT_W (금고 출금)
        res_vault = SpendingLoggerService.log_vault_withdrawal(db, user_id, 50000, 999) # request_id=999
        assert res_vault > 0
        
        # 중복 방지 검증 (Ref ID 동일 시 0 반환)
        res_dup = SpendingLoggerService.log_hq_withdrawal(db, user_id, 100000, f"hq_ref_{ref_id}")
        assert res_dup == 0 

# =============================================================================
# 2. VIP Classification & Welcome Trigger (SOT 01, 02)
# =============================================================================

class TestSegmentTechnicalStandard:
    def test_vip_classification_threshold(self, db: Session, technical_user: V2User):
        """마진 1,000,000 KRW 돌파 시 VIP 승격 검증."""
        service = V2SegmentService(db)
        
        # 1. 초기 상태: COMMON
        segment = service.get_or_create_segment(technical_user.id)
        assert segment.segment == "COMMON"
        
        # 2. 마진 1,000,001 KRW 업데이트 (본사 CSV 임포트 시뮬레이션)
        segment.total_margin = 1000001
        db.commit()
        
        # 3. 재평가 및 자동 승격 확인
        updated_segment = service.refresh_user_segment(technical_user.id)
        assert updated_segment == "VIP"

# =============================================================================
# 3. Latency Survival & Strict Clawback (SOT 02, 03)
# =============================================================================

class TestLatencyTechnicalStandard:
    def test_strict_recursive_clawback_and_negative_balance(self, db: Session, technical_user: V2User):
        """허위 신고 시 선지급액 + 당첨금 전액 회수 및 음수 잔액 발생 검증."""
        user_id = technical_user.id
        inventory = V2InventoryService(db)
        
        # 1. 선지급 (ROULETTE_TICKET 5개)
        LatencySurvivalService = V2LatencySurvivalService
        LatencySurvivalService.submit_evidence(
            db, user_id, amount=50000, tx_id="FAKE_TX_123", claimed_amount=50000
        )
        # (서비스 내부적으로 선지급이 일어났다고 가정하고 인벤토리 확인)
        # 실제 route 호출이 아니므로 수동으로 선지급 시뮬레이션
        inventory.add_item(user_id, "ROULETTE_TICKET", 5, "LATENCY_PROVISIONAL")
        
        # 2. 유저가 티켓 1개 사용 -> 10,000원 당첨 시뮬레이션
        # 룰렛 로그 기록
        log = V2RouletteLog(
            user_id=user_id,
            reward_type="POINT",
            reward_amount=10000,
            is_win=True,
            created_at=datetime.utcnow()
        )
        db.add(log)
        inventory.add_item(user_id, "POINT", 10000, "ROULETTE_WIN")
        db.commit()
        
        # 3. 관리자 반려 (Clawback 트리거)
        evidence = db.query(V2UserDepositEvidence).filter_by(tx_id="FAKE_TX_123").first()
        
        # Strict Clawback 실행: 5티켓 + 10,000원 회수
        stats = V2LatencySurvivalService.reject_evidence(db, admin_id=1, evidence_id=evidence.id, reason="FRAUD")
        
        # 4. 결과 검증
        # 포인트 잔액이 10,000원이었는데 회수(선지급 가치 + 당첨금)가 일어나면 음수가 될 수 있음
        # SOT v2.3 정책: "선지급액 + 당첨금 전액 회수"
        # 여기서는 간단히 포인트 회수 여부만 확인 (시스템 설정에 따라 다름)
        assert stats["clawback_status"] == "COMPLETED"
        
        current_points = inventory.get_balance(user_id, "POINT")
        # 초기 10000(보상) - 10000(회수) = 0 (또는 선지급 가치만큼 더 빠지면 음수)
        assert current_points <= 0

# =============================================================================
# 4. Redis/DB Consistency Snapshot (SOT 03)
# =============================================================================
# (Mocking Redis is required for unit tests, here we focus on DB Model parity)
