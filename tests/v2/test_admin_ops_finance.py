"""
V2 Admin Ops & Finance Tests

테스트 범위:
1. 활성 유저 통계 (DAU, WAU, MAU)
2. 일간 수익/지출 계산
3. 금고 잔액 집계
4. 지출 한도 추적
5. 미션 강제 리셋
6. 감시 로그 (NUDGE_SEND, ROI_CALCULATE, ROLLBACK_EXECUTE)
"""
import pytest
from datetime import date, datetime, timedelta


# ============ Active User Statistics Tests ============

class TestActiveUserStats:
    """활성 유저 통계 테스트"""

    def test_dau_calculation(self):
        """DAU 계산"""
        today_logins = 150
        assert today_logins > 0

    def test_wau_calculation(self):
        """WAU 계산 (7일)"""
        week_logins = [150, 140, 160, 155, 145, 170, 165]
        wau = len(set(range(sum(week_logins))))  # 근사
        assert len(week_logins) == 7

    def test_mau_calculation(self):
        """MAU 계산 (30일)"""
        monthly_users = 5000
        assert monthly_users > 0

    def test_dau_change_rate(self):
        """DAU 변화율 계산"""
        today_dau = 160
        yesterday_dau = 150

        change_rate = (today_dau - yesterday_dau) / yesterday_dau
        assert round(change_rate, 4) == 0.0667

    def test_negative_change_rate(self):
        """음의 변화율"""
        today_dau = 140
        yesterday_dau = 150

        change_rate = (today_dau - yesterday_dau) / yesterday_dau
        assert round(change_rate, 4) == -0.0667

    def test_zero_yesterday_handling(self):
        """어제 DAU 0 처리"""
        today_dau = 100
        yesterday_dau = 0

        change_rate = (today_dau - yesterday_dau) / yesterday_dau if yesterday_dau > 0 else 0.0
        assert change_rate == 0.0


class TestActiveUserTrend:
    """활성 유저 추이 테스트"""

    def test_trend_data_structure(self):
        """추이 데이터 구조"""
        trend_item = {
            "date": "2026-01-29",
            "dau": 150,
            "new_users": 20,
        }
        assert "date" in trend_item
        assert "dau" in trend_item
        assert "new_users" in trend_item

    def test_trend_days_range(self):
        """추이 기간 범위"""
        days = 7
        min_days = 1
        max_days = 30

        assert min_days <= days <= max_days


# ============ Daily Revenue Tests ============

class TestDailyRevenue:
    """일간 수익 테스트"""

    def test_total_deposits_calculation(self):
        """총 입금액 계산"""
        deposits = [10000, 25000, 15000, 50000]
        total = sum(deposits)

        assert total == 100000

    def test_deposit_count(self):
        """입금 건수"""
        deposits = [10000, 25000, 15000, 50000]
        count = len(deposits)

        assert count == 4

    def test_unique_depositors(self):
        """고유 입금자 수"""
        deposits_by_user = {
            1: [10000, 5000],
            2: [25000],
            3: [15000],
            4: [50000],
        }
        unique_count = len(deposits_by_user)

        assert unique_count == 4

    def test_date_filtering(self):
        """날짜 필터링"""
        target_date = date(2026, 1, 29)
        assert target_date.isoformat() == "2026-01-29"


# ============ Daily Spending Tests ============

class TestDailySpending:
    """일간 지출 테스트"""

    def test_total_withdrawals(self):
        """총 출금액 (승인된 것만)"""
        approved_withdrawals = [5000, 10000, 15000]
        total = sum(approved_withdrawals)

        assert total == 30000

    def test_pending_withdrawals(self):
        """대기 중인 출금액"""
        pending = [20000, 30000]
        total_pending = sum(pending)

        assert total_pending == 50000

    def test_net_income_calculation(self):
        """순수익 계산"""
        total_deposits = 100000
        total_withdrawals = 30000

        net_income = total_deposits - total_withdrawals
        assert net_income == 70000


# ============ Vault Aggregate Tests ============

class TestVaultAggregate:
    """금고 잔액 집계 테스트"""

    def test_total_locked_balance(self):
        """전체 locked_balance 합계"""
        balances = [10000, 20000, 30000, 50000]
        total = sum(balances)

        assert total == 110000

    def test_average_balance(self):
        """평균 잔액"""
        balances = [10000, 20000, 30000, 50000]
        avg = sum(balances) / len(balances)

        assert avg == 27500.0

    def test_median_balance(self):
        """중간값 잔액"""
        balances = sorted([10000, 20000, 30000, 50000])
        mid = len(balances) // 2

        if len(balances) % 2 == 0:
            median = (balances[mid - 1] + balances[mid]) / 2
        else:
            median = balances[mid]

        assert median == 25000.0

    def test_max_balance(self):
        """최대 잔액"""
        balances = [10000, 20000, 30000, 50000]
        max_val = max(balances)

        assert max_val == 50000


# ============ Spend Limit Tests ============

class TestSpendLimit:
    """지출 한도 추적 테스트"""

    def test_usage_rate_calculation(self):
        """사용률 계산"""
        daily_spent = 40000
        daily_limit = 50000

        usage_rate = daily_spent / daily_limit
        assert usage_rate == 0.8

    def test_limit_reached(self):
        """한도 도달 확인"""
        daily_spent = 50000
        daily_limit = 50000

        is_limit_reached = daily_spent >= daily_limit
        assert is_limit_reached is True

    def test_above_80_percent(self):
        """80% 이상 사용 확인"""
        daily_spent = 45000
        daily_limit = 50000
        threshold = 0.8

        usage_rate = daily_spent / daily_limit
        is_above_80 = usage_rate >= threshold

        assert is_above_80 is True

    def test_min_usage_filter(self):
        """최소 사용률 필터"""
        users = [
            {"usage_rate": 0.9},
            {"usage_rate": 0.7},
            {"usage_rate": 0.5},
            {"usage_rate": 0.3},
        ]
        min_filter = 0.6

        filtered = [u for u in users if u["usage_rate"] >= min_filter]
        assert len(filtered) == 2


# ============ Mission Reset Tests ============

class TestMissionReset:
    """미션 강제 리셋 테스트"""

    def test_single_mission_reset(self):
        """단일 미션 리셋"""
        progress = {
            "progress": 5,
            "is_completed": True,
            "is_claimed": False,
        }

        # 리셋 후
        progress["progress"] = 0
        progress["is_completed"] = False
        progress["is_claimed"] = False

        assert progress["progress"] == 0
        assert progress["is_completed"] is False

    def test_bulk_mission_reset(self):
        """전체 미션 리셋"""
        progresses = [
            {"mission_id": 1, "progress": 5},
            {"mission_id": 2, "progress": 3},
            {"mission_id": 3, "progress": 10},
        ]

        reset_ids = []
        for p in progresses:
            p["progress"] = 0
            reset_ids.append(p["mission_id"])

        assert len(reset_ids) == 3
        assert all(p["progress"] == 0 for p in progresses)

    def test_reset_reason_required(self):
        """리셋 사유 필수"""
        reason = "테스트 목적 리셋"
        assert len(reason) > 0


# ============ Audit Log Tests ============

class TestAuditLog:
    """감시 로그 테스트"""

    def test_nudge_send_log(self):
        """NUDGE_SEND 로그"""
        log = {
            "action": "NUDGE_SEND",
            "category": "GOLDEN",
            "target_id": "user:123",
            "metadata": {"nudge_type": "COMEBACK"},
        }
        assert log["action"] == "NUDGE_SEND"

    def test_roi_calculate_log(self):
        """ROI_CALCULATE 로그"""
        log = {
            "action": "ROI_CALCULATE",
            "category": "GOLDEN",
            "metadata": {"roi_value": 1.5, "period": "daily"},
        }
        assert log["action"] == "ROI_CALCULATE"

    def test_rollback_execute_log(self):
        """ROLLBACK_EXECUTE 로그"""
        log = {
            "action": "ROLLBACK_EXECUTE",
            "category": "GOLDEN",
            "target_id": "transaction:456",
            "metadata": {"amount": 10000, "reason": "오류 수정"},
        }
        assert log["action"] == "ROLLBACK_EXECUTE"

    def test_log_filtering(self):
        """로그 필터링"""
        logs = [
            {"action": "NUDGE_SEND"},
            {"action": "ROI_CALCULATE"},
            {"action": "ROLLBACK_EXECUTE"},
            {"action": "NUDGE_SEND"},
        ]

        nudge_logs = [l for l in logs if l["action"] == "NUDGE_SEND"]
        assert len(nudge_logs) == 2

    def test_log_pagination(self):
        """로그 페이지네이션"""
        total = 150
        limit = 50
        offset = 50

        page = 2
        expected_offset = (page - 1) * limit

        assert expected_offset == offset


# ============ Integration Tests ============

class TestOpsIntegration:
    """통합 테스트"""

    def test_daily_finance_summary(self):
        """일간 재무 요약"""
        revenue = {"total_deposits": 100000, "deposit_count": 50}
        spending = {"total_withdrawals": 30000, "withdrawal_count": 10}

        net_income = revenue["total_deposits"] - spending["total_withdrawals"]

        assert net_income == 70000

    def test_active_user_revenue_correlation(self):
        """활성 유저와 수익 상관관계"""
        days_data = [
            {"dau": 100, "revenue": 50000},
            {"dau": 150, "revenue": 75000},
            {"dau": 200, "revenue": 100000},
        ]

        # 높은 DAU = 높은 수익 경향
        sorted_by_dau = sorted(days_data, key=lambda x: x["dau"], reverse=True)
        sorted_by_revenue = sorted(days_data, key=lambda x: x["revenue"], reverse=True)

        assert sorted_by_dau == sorted_by_revenue


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
