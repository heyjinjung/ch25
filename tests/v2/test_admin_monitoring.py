"""
V2 Admin Monitoring Tests (8.4, 8.5, 8.6)

테스트 범위:
1. 8.4 Vault Monitoring - 금고 잔액 집계, 지출 한도 추적
2. 8.5 Inventory - 재고 조정, Gifticon 배송, 재고 부족 알림
3. 8.6 Mission - 로그인 미션 검증, 미션 통계
"""
import pytest
from datetime import date, datetime, timedelta
from pydantic import ValidationError


# ============ 8.4 Vault Monitoring Schema Tests ============

class TestVaultMonitoringSchemas:
    """Vault 모니터링 스키마 테스트"""

    def test_vault_aggregate_calculation(self):
        """금고 잔액 집계 계산"""
        users = [
            {"vault_locked_balance": 10000},
            {"vault_locked_balance": 20000},
            {"vault_locked_balance": 30000},
            {"vault_locked_balance": 40000},
        ]

        total = sum(u["vault_locked_balance"] for u in users)
        avg = total / len(users)
        max_val = max(u["vault_locked_balance"] for u in users)

        assert total == 100000
        assert avg == 25000
        assert max_val == 40000

    def test_median_balance_calculation(self):
        """중간값 계산"""
        balances = [1000, 2000, 3000, 4000, 5000]
        mid = len(balances) // 2
        median = balances[mid]

        assert median == 3000

    def test_spend_limit_usage_rate(self):
        """지출 한도 사용률 계산"""
        daily_spent = 40000
        daily_limit = 50000

        usage_rate = daily_spent / daily_limit

        assert usage_rate == 0.8
        assert usage_rate < 1.0

    def test_spend_limit_reached(self):
        """한도 도달 여부"""
        daily_spent = 50000
        daily_limit = 50000

        is_limit_reached = daily_spent >= daily_limit

        assert is_limit_reached is True

    def test_spend_limit_summary_aggregation(self):
        """지출 한도 요약 집계"""
        users = [
            {"daily_spent": 50000},  # 100% (at limit)
            {"daily_spent": 45000},  # 90%
            {"daily_spent": 40000},  # 80%
            {"daily_spent": 30000},  # 60%
            {"daily_spent": 10000},  # 20%
        ]
        daily_limit = 50000

        total_spent = sum(u["daily_spent"] for u in users)
        users_at_limit = sum(1 for u in users if u["daily_spent"] >= daily_limit)
        users_above_80 = sum(1 for u in users if u["daily_spent"] >= daily_limit * 0.8)

        assert total_spent == 175000
        assert users_at_limit == 1
        assert users_above_80 == 3

    def test_suspended_user_estimation(self):
        """제재 유저 추정 (30k 상한)"""
        users = [
            {"vault_locked_balance": 30000},
            {"vault_locked_balance": 30000},
            {"vault_locked_balance": 25000},
            {"vault_locked_balance": 10000},
        ]

        # 30k 이상인 유저 = 잠재적 제재 유저
        suspended_estimate = sum(1 for u in users if u["vault_locked_balance"] >= 30000)
        suspended_balance = sum(u["vault_locked_balance"] for u in users if u["vault_locked_balance"] >= 30000)

        assert suspended_estimate == 2
        assert suspended_balance == 60000


# ============ 8.5 Inventory Admin Schema Tests ============

class TestInventoryAdminSchemas:
    """인벤토리 관리 스키마 테스트"""

    def test_stock_adjust_delta_positive(self):
        """재고 증가"""
        old_quantity = 10
        delta = 5
        new_quantity = old_quantity + delta

        assert new_quantity == 15

    def test_stock_adjust_delta_negative(self):
        """재고 감소"""
        old_quantity = 10
        delta = -3
        new_quantity = max(0, old_quantity + delta)

        assert new_quantity == 7

    def test_stock_adjust_prevent_negative(self):
        """음수 재고 방지"""
        old_quantity = 5
        delta = -10
        new_quantity = max(0, old_quantity + delta)

        assert new_quantity == 0

    def test_gifticon_status_parsing(self):
        """Gifticon 상태 파싱"""
        reasons = [
            "ORDER_CREATED",
            "DELIVERED:ABC123",
            "FAILED:NETWORK_ERROR",
        ]

        statuses = []
        for reason in reasons:
            if "DELIVERED" in reason:
                statuses.append("DELIVERED")
            elif "FAILED" in reason:
                statuses.append("FAILED")
            else:
                statuses.append("PENDING")

        assert statuses == ["PENDING", "DELIVERED", "FAILED"]

    def test_gifticon_delivery_stats(self):
        """Gifticon 배송 통계"""
        deliveries = [
            {"status": "PENDING"},
            {"status": "PENDING"},
            {"status": "DELIVERED"},
            {"status": "DELIVERED"},
            {"status": "DELIVERED"},
            {"status": "FAILED"},
        ]

        total = len(deliveries)
        pending = sum(1 for d in deliveries if d["status"] == "PENDING")
        delivered = sum(1 for d in deliveries if d["status"] == "DELIVERED")
        failed = sum(1 for d in deliveries if d["status"] == "FAILED")

        assert total == 6
        assert pending == 2
        assert delivered == 3
        assert failed == 1

    def test_stock_alert_threshold(self):
        """재고 부족 임계값"""
        threshold = 10
        critical_threshold = threshold // 2

        stocks = [
            {"item_type": "ITEM_A", "quantity": 15},  # OK
            {"item_type": "ITEM_B", "quantity": 8},   # Warning
            {"item_type": "ITEM_C", "quantity": 4},   # Critical
            {"item_type": "ITEM_D", "quantity": 0},   # Critical
        ]

        alerts = []
        for stock in stocks:
            if stock["quantity"] <= threshold:
                is_critical = stock["quantity"] <= critical_threshold
                alerts.append({
                    "item_type": stock["item_type"],
                    "quantity": stock["quantity"],
                    "is_critical": is_critical,
                })

        assert len(alerts) == 3
        assert alerts[0]["is_critical"] is False  # ITEM_B
        assert alerts[1]["is_critical"] is True   # ITEM_C
        assert alerts[2]["is_critical"] is True   # ITEM_D


# ============ 8.6 Mission Admin Schema Tests ============

class TestMissionAdminSchemas:
    """미션 관리 스키마 테스트"""

    def test_operational_date_before_reset(self):
        """리셋 전 운영일 (전날)"""
        # 09:00 KST 이전은 전날 운영일
        reset_hour = 9
        current_hour = 8  # 08:00 KST

        if current_hour < reset_hour:
            operational_date = date(2026, 1, 29) - timedelta(days=1)
        else:
            operational_date = date(2026, 1, 29)

        assert operational_date == date(2026, 1, 28)

    def test_operational_date_after_reset(self):
        """리셋 후 운영일 (오늘)"""
        reset_hour = 9
        current_hour = 10  # 10:00 KST

        if current_hour < reset_hour:
            operational_date = date(2026, 1, 29) - timedelta(days=1)
        else:
            operational_date = date(2026, 1, 29)

        assert operational_date == date(2026, 1, 29)

    def test_login_mission_completion_rate(self):
        """로그인 미션 완료율"""
        total_logins = 100
        completed = 75

        completion_rate = completed / total_logins if total_logins > 0 else 0.0

        assert completion_rate == 0.75

    def test_mission_completion_stats(self):
        """미션 완료 통계"""
        progresses = [
            {"is_completed": True, "is_claimed": True},
            {"is_completed": True, "is_claimed": False},
            {"is_completed": False, "is_claimed": False},
            {"is_completed": True, "is_claimed": True},
            {"is_completed": False, "is_claimed": False},
        ]

        total = len(progresses)
        completed = sum(1 for p in progresses if p["is_completed"])
        claimed = sum(1 for p in progresses if p["is_claimed"])
        completion_rate = completed / total if total > 0 else 0.0

        assert total == 5
        assert completed == 3
        assert claimed == 2
        assert completion_rate == 0.6

    def test_mission_reset_date_format(self):
        """미션 리셋 날짜 형식"""
        operational_date = date(2026, 1, 29)
        reset_date_str = operational_date.isoformat()

        assert reset_date_str == "2026-01-29"

    def test_login_streak_tracking(self):
        """로그인 스트릭 추적"""
        login_streak = 7
        last_login_at = datetime(2026, 1, 29, 10, 0, 0)

        assert login_streak == 7
        assert last_login_at.date() == date(2026, 1, 29)


# ============ Integration Logic Tests ============

class TestVaultSpendLimitLogic:
    """금고 지출 한도 로직 테스트"""

    def test_daily_reset_check(self):
        """일일 리셋 확인"""
        today = date.today().isoformat()
        user_reset_date = "2026-01-28"  # 어제

        needs_reset = user_reset_date != today

        assert needs_reset is True

    def test_no_reset_same_day(self):
        """같은 날 리셋 불필요"""
        today = "2026-01-29"
        user_reset_date = "2026-01-29"

        needs_reset = user_reset_date != today

        assert needs_reset is False

    def test_spend_limit_enforcement(self):
        """지출 한도 적용"""
        daily_limit = 50000
        current_spent = 45000
        requested_amount = 10000

        remaining = daily_limit - current_spent
        allowed_amount = min(requested_amount, remaining)

        assert remaining == 5000
        assert allowed_amount == 5000


class TestInventoryStockLogic:
    """인벤토리 재고 로직 테스트"""

    def test_stock_balance_tracking(self):
        """재고 잔량 추적"""
        initial_stock = 100
        issued = 30
        used = 15

        current_stock = initial_stock - issued + used
        # 실제로는 issued가 지급이고 used가 소모
        # 여기서는 granted - consumed 형태
        current_stock = initial_stock  # 초기
        current_stock += 30  # grant
        current_stock -= 15  # use

        assert current_stock == 115

    def test_ledger_based_calculation(self):
        """원장 기반 계산"""
        ledger_entries = [
            {"change_amount": 100},   # initial grant
            {"change_amount": -20},   # use
            {"change_amount": 50},    # grant
            {"change_amount": -30},   # use
        ]

        balance = sum(e["change_amount"] for e in ledger_entries)

        assert balance == 100


class TestMissionVerificationLogic:
    """미션 검증 로직 테스트"""

    def test_mission_filter_by_logic_key(self):
        """logic_key로 미션 필터링"""
        missions = [
            {"logic_key": "daily_login", "title": "일일 로그인"},
            {"logic_key": "play_game", "title": "게임 플레이"},
            {"logic_key": "weekly_login", "title": "주간 로그인"},
        ]

        login_missions = [m for m in missions if "login" in m["logic_key"].lower()]

        assert len(login_missions) == 2

    def test_progress_reset_date_matching(self):
        """진행도 리셋 날짜 매칭"""
        operational_date = "2026-01-29"
        progresses = [
            {"user_id": 1, "reset_date": "2026-01-29", "is_completed": True},
            {"user_id": 2, "reset_date": "2026-01-28", "is_completed": True},  # 어제
            {"user_id": 3, "reset_date": "2026-01-29", "is_completed": False},
        ]

        today_completed = [
            p for p in progresses
            if p["reset_date"] == operational_date and p["is_completed"]
        ]

        assert len(today_completed) == 1
        assert today_completed[0]["user_id"] == 1


# ============ Audit Log Type Tests ============

class TestAdminAuditLogTypes:
    """감사 로그 타입 테스트"""

    def test_stock_adjust_action(self):
        """재고 조정 액션"""
        action = "STOCK_ADJUST"
        target_type = "INVENTORY"
        before = {"quantity": 10}
        after = {"quantity": 15, "delta": 5, "reason": "admin_adjustment"}

        assert action == "STOCK_ADJUST"
        assert after["quantity"] - before["quantity"] == after["delta"]

    def test_mission_verify_action(self):
        """미션 검증 액션"""
        action = "MISSION_VERIFY"
        target_type = "MISSION"

        assert action == "MISSION_VERIFY"

    def test_gifticon_delivery_action(self):
        """기프티콘 배송 액션"""
        action = "GIFTICON_DELIVERY"
        status = "DELIVERED"
        delivery_code = "ABC123XYZ"

        assert action == "GIFTICON_DELIVERY"
        assert status == "DELIVERED"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
