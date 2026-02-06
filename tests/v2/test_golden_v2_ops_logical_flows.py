"""Golden V2 Operational Flow Integration Tests (v2.3).

도메인: 운영 로직 및 리텐션 전략
커버리지 대상: golden_intervention_service.py, daily_nudge_service.py, roi_analysis_service.py
SoT 문서: 02. Logic & Policy, 04. Ops & Marketing
"""
import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.v2.models import V2User, V2GoldenInterventionLog, UserInventoryItem
from app.v2.services.golden_intervention_service import GoldenInterventionService
from app.v2.services.daily_nudge_service import DailyNudgeService
from app.v2.services.roi_analysis_service import V2RoiAnalysisService

@pytest.fixture
def ops_user(db: Session) -> V2User:
    user = V2User(cc_id="ops_test_user", nickname="운영테스터")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# =============================================================================
# 1. Trigger Logic: TRG_LOSE_5 (SOT 02)
# =============================================================================

class TestGoldenInterventionOps:
    def test_trg_lose_5_detection_and_pending_log(self, db: Session, ops_user: V2User):
        """5연패 감지 및 PENDING_APPROVAL 로그 생성 검증."""
        service = GoldenInterventionService(db)
        
        # 5연패 상황 시뮬레이션
        # check_lose_streak_trigger(user_id, recent_results, cooldown_hours=1)
        res = service.check_lose_streak_trigger(
            user_id=ops_user.id,
            recent_results=["LOSE"] * 5,
            cooldown_hours=1
        )
        
        # 1. PENDING 로그 생성 확인
        log = db.query(V2GoldenInterventionLog).filter_by(
            user_id=ops_user.id, 
            trigger_id="TRG_LOSE_5"
        ).first()
        
        assert log is not None
        assert log.status == "PENDING_APPROVAL"
        assert "LOSE" in log.recent_results

# =============================================================================
# 2. Nudge Strategy: TRIAL_TICKET Expiration (SOT 04)
# =============================================================================

class TestDailyNudgeOps:
    def test_trial_ticket_expiration_at_0900(self, db: Session, ops_user: V2User):
        """TRIAL_TICKET이 익일 09:00에 정상 소멸되는지 검증."""
        nudge = DailyNudgeService(db)
        
        # 1. TRIAL 티켓 지급 (만료 시각 설정)
        tomorrow_09 = (datetime.utcnow() + timedelta(days=1)).replace(hour=0, minute=0, second=0) # UTC 기준 09:00 AM KST는 대략 UTC 00:00
        nudge.grant_trial_reward(ops_user.id, "TRIAL_TICKET", 3, expires_at=tomorrow_09)
        
        # 2. 만료 처리 엔진 실행
        expired_count = nudge.cleanup_expired_tickets(now=tomorrow_09 + timedelta(seconds=1))
        
        # 3. 인벤토리 확인
        item = db.query(UserInventoryItem).filter_by(
            user_id=ops_user.id, 
            item_id="TRIAL_TICKET"
        ).first()
        
        assert item is None or item.quantity == 0

# =============================================================================
# 3. ROI Calculation Accuracy (SOT 04)
# =============================================================================

class TestRoiAnalysisOps:
    def test_roi_formula_compliance(self):
        """SOT v2.2 명시 ROI 공식 (Return-Cost)/Cost 정확도 검증."""
        # Cost: 1000, Return: 5000 -> ROI: (5000-1000)/1000 * 100 = 400%
        roi = V2RoiAnalysisService.calculate_simple_roi(cost=1000, revenue=5000)
        assert roi == 400.0
        
        # Zero Cost 케이스 방어
        assert V2RoiAnalysisService.calculate_simple_roi(cost=0, revenue=100) == 0.0
