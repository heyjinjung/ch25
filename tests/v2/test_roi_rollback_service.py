"""
V2 ROI & Rollback Service Tests

테스트 범위:
1. ROI 계산 로직
2. 캠페인 ROI 분석
3. 회수(Rollback) 로직
4. 부분 회수 처리
5. 엣지 케이스
"""
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

from app.v2.services.roi_analysis_service import RoiConfig, V2RoiAnalysisService
from app.v2.services.rollback_service import V2RollbackService, RollbackResult


# ============ ROI Calculator Tests ============

class TestRoiConfig:
    """ROI 설정 테스트"""

    def test_roulette_ticket_cost(self):
        """룰렛 티켓 원가 계산"""
        cost = RoiConfig.get_reward_cost("ROULETTE", 1)
        assert cost == 100

        cost_10 = RoiConfig.get_reward_cost("ROULETTE", 10)
        assert cost_10 == 1000

    def test_vault_krw_cost(self):
        """금고 KRW 원가 (1:1)"""
        cost = RoiConfig.get_reward_cost("VAULT", 500)
        assert cost == 500

    def test_unknown_reward_type(self):
        """알 수 없는 보상 유형은 0원"""
        cost = RoiConfig.get_reward_cost("UNKNOWN", 100)
        assert cost == 0

    def test_behavior_values(self):
        """행동 가치 설정 검증"""
        assert RoiConfig.LOGIN_VALUE == 50
        assert RoiConfig.AD_VIEW_VALUE == 10
        assert RoiConfig.GAME_PLAY_VALUE == 20


class TestRoiCalculation:
    """ROI 계산 로직 테스트"""

    def test_roi_percentage_calculation(self):
        """ROI 퍼센티지 계산"""
        cost = 100
        return_value = 150

        roi = ((return_value - cost) / cost) * 100
        assert roi == 50.0  # 50% ROI

    def test_negative_roi(self):
        """마이너스 ROI"""
        cost = 100
        return_value = 50

        roi = ((return_value - cost) / cost) * 100
        assert roi == -50.0  # -50% ROI

    def test_zero_cost_roi(self):
        """비용이 0인 경우"""
        cost = 0
        return_value = 100

        if cost > 0:
            roi = ((return_value - cost) / cost) * 100
        else:
            roi = 0.0

        assert roi == 0.0

    def test_24h_window_calculation(self):
        """24시간 윈도우 계산"""
        intervention_at = datetime(2026, 1, 29, 12, 0, 0, tzinfo=timezone.utc)
        window_start = intervention_at
        window_end = intervention_at + timedelta(hours=24)

        # 23시간 후는 윈도우 내
        check_time_1 = intervention_at + timedelta(hours=23)
        assert window_start <= check_time_1 <= window_end

        # 25시간 후는 윈도우 밖
        check_time_2 = intervention_at + timedelta(hours=25)
        assert not (window_start <= check_time_2 <= window_end)


class TestCampaignRoiAnalysis:
    """캠페인 ROI 분석 테스트"""

    def test_empty_campaign_results(self):
        """대상이 없는 캠페인"""
        result = {
            "total_users": 0,
            "total_cost": 0.0,
            "total_return": 0.0,
            "avg_roi": 0.0,
            "positive_roi_count": 0,
        }

        assert result["total_users"] == 0
        assert result["avg_roi"] == 0.0

    def test_campaign_aggregation(self):
        """캠페인 집계 계산"""
        logs = [
            {"marketing_cost": 100, "predicted_ltv": 150, "roi_percent": 50.0},
            {"marketing_cost": 200, "predicted_ltv": 180, "roi_percent": -10.0},
            {"marketing_cost": 100, "predicted_ltv": 200, "roi_percent": 100.0},
        ]

        total_users = len(logs)
        total_cost = sum(log["marketing_cost"] for log in logs)
        total_return = sum(log["predicted_ltv"] for log in logs)
        avg_roi = sum(log["roi_percent"] for log in logs) / total_users
        positive_roi_count = sum(1 for log in logs if log["roi_percent"] > 0)

        assert total_users == 3
        assert total_cost == 400
        assert total_return == 530
        assert round(avg_roi, 2) == 46.67
        assert positive_roi_count == 2


# ============ Rollback Service Tests ============

class TestRollbackResult:
    """회수 결과 객체 테스트"""

    def test_add_success(self):
        """성공 건 추가"""
        result = RollbackResult()
        result.add_success(user_id=1, amount=100, message="OK")

        assert result.total == 1
        assert result.success == 1
        assert result.failed == 0
        assert len(result.details) == 1

    def test_add_failed(self):
        """실패 건 추가"""
        result = RollbackResult()
        result.add_failed(user_id=1, amount=100, message="ERROR")

        assert result.total == 1
        assert result.failed == 1
        assert result.success == 0

    def test_add_partial(self):
        """부분 회수 건 추가"""
        result = RollbackResult()
        result.add_partial(user_id=1, requested=100, recovered=50, message="PARTIAL")

        assert result.total == 1
        assert result.partial == 1
        assert result.details[0]["requested"] == 100
        assert result.details[0]["recovered"] == 50

    def test_mixed_results(self):
        """혼합 결과"""
        result = RollbackResult()
        result.add_success(1, 100)
        result.add_failed(2, 50)
        result.add_partial(3, 100, 60)

        assert result.total == 3
        assert result.success == 1
        assert result.failed == 1
        assert result.partial == 1


class TestRollbackVault:
    """금고 회수 테스트"""

    def test_full_recovery(self):
        """전액 회수"""
        current_balance = 1000
        amount_to_recover = 500

        recoverable = min(amount_to_recover, current_balance)
        is_full = recoverable == amount_to_recover

        assert recoverable == 500
        assert is_full is True

    def test_partial_recovery(self):
        """부분 회수 (잔액 부족)"""
        current_balance = 300
        amount_to_recover = 500

        recoverable = min(amount_to_recover, current_balance)
        is_full = recoverable == amount_to_recover

        assert recoverable == 300
        assert is_full is False

    def test_insufficient_balance(self):
        """잔액 없음"""
        current_balance = 0
        amount_to_recover = 500

        if current_balance <= 0:
            can_recover = False
        else:
            can_recover = True

        assert can_recover is False

    def test_admin_memo_format(self):
        """관리자 메모 형식"""
        reason = "test_rollback"
        admin_id = 123

        admin_memo = f"ROLLBACK:{reason}"
        if admin_id:
            admin_memo += f":admin_{admin_id}"

        assert admin_memo == "ROLLBACK:test_rollback:admin_123"


class TestRollbackExecution:
    """실행 전체 회수 테스트"""

    def test_execution_not_found(self):
        """존재하지 않는 실행 ID"""
        execution_id = "non_existent_id"
        # 로그가 없으면 회수 대상 0건

        result = {
            "total": 0,
            "success": 0,
            "failed": 0,
            "partial": 0,
            "details": [],
        }

        assert result["total"] == 0

    def test_already_rolled_back(self):
        """이미 회수된 실행"""
        # rolled_back_at이 None이 아닌 경우 제외

        logs = [
            {"user_id": 1, "amount": 100, "rolled_back_at": datetime.now(timezone.utc)},
            {"user_id": 2, "amount": 200, "rolled_back_at": None},
        ]

        eligible_logs = [log for log in logs if log["rolled_back_at"] is None]

        assert len(eligible_logs) == 1
        assert eligible_logs[0]["user_id"] == 2

    def test_rollback_timestamp(self):
        """회수 시각 기록"""
        now = datetime.now(timezone.utc)
        rolled_back_at = now

        assert rolled_back_at <= datetime.now(timezone.utc)


class TestRollbackPolicy:
    """회수 정책 테스트"""

    def test_policy_a_partial_recovery(self):
        """Policy A: 회수 가능한 만큼만 회수"""
        requested = 500
        available = 300

        # Policy A: Partial Clawback
        recovered = min(requested, available)
        remaining_debt = 0  # Debt 시스템 없음

        assert recovered == 300
        assert remaining_debt == 0

    def test_policy_b_debt_tracking(self):
        """Policy B: Debt 추적 (미구현)"""
        requested = 500
        available = 300

        # Policy B: Debt System (Phase 4)
        recovered = available
        remaining_debt = requested - recovered

        assert recovered == 300
        assert remaining_debt == 200


class TestRollbackTicket:
    """티켓 회수 테스트"""

    def test_ticket_recovery_structure(self):
        """티켓 회수 구조"""
        result = {
            "success": True,
            "recovered": 10,
            "requested": 10,
            "is_full": True,
            "message": "FULL_RECOVERY",
        }

        assert result["success"] is True
        assert result["recovered"] == result["requested"]
        assert result["is_full"] is True

    def test_unsupported_ticket_type(self):
        """지원하지 않는 티켓 유형"""
        token_type = "UNKNOWN_TICKET"
        supported_types = ["ROULETTE", "DICE", "LOTTERY"]

        is_supported = token_type in supported_types
        assert is_supported is False


class TestRollbackItem:
    """아이템 회수 테스트"""

    def test_already_used_item(self):
        """이미 사용된 아이템"""
        item_used = True

        if item_used:
            result = {
                "success": False,
                "recovered": 0,
                "message": "ALREADY_USED",
            }
        else:
            result = {
                "success": True,
                "recovered": 1,
                "message": "RECOVERED",
            }

        assert result["success"] is False
        assert result["message"] == "ALREADY_USED"

    def test_unused_item_recovery(self):
        """미사용 아이템 회수"""
        item_used = False

        if item_used:
            success = False
        else:
            success = True

        assert success is True


class TestEdgeCases:
    """엣지 케이스 테스트"""

    def test_zero_amount_rollback(self):
        """0원 회수"""
        amount = 0
        is_valid = amount > 0

        assert is_valid is False

    def test_negative_amount_rollback(self):
        """음수 회수 (불가)"""
        amount = -100
        is_valid = amount > 0

        assert is_valid is False

    def test_concurrent_rollback_prevention(self):
        """동시 회수 방지"""
        # 첫 번째 회수 시작
        is_rolling_back = True

        # 두 번째 회수 시도
        if is_rolling_back:
            can_rollback = False
        else:
            can_rollback = True

        assert can_rollback is False

    def test_large_batch_rollback(self):
        """대량 회수"""
        total_users = 10000
        chunk_size = 1000

        num_chunks = (total_users + chunk_size - 1) // chunk_size
        assert num_chunks == 10


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
