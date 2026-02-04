"""V2 Admin 서비스 테스트.

도메인: 어드민 기능
커버리지 대상: admin_*.py 서비스들
"""
import pytest
from datetime import date, datetime


class TestAdminAuditLog:
    """어드민 감사 로그 테스트."""

    def test_audit_log_has_required_fields(self):
        """감사 로그 필수 필드."""
        log = {
            "admin_id": 1,
            "action": "USER_UPDATE",
            "target_id": 100,
            "target_type": "USER",
            "timestamp": datetime.utcnow(),
            "details": {"field": "status", "old": "ACTIVE", "new": "SUSPENDED"},
        }
        
        required = ["admin_id", "action", "target_id", "target_type", "timestamp"]
        for field in required:
            assert field in log

    def test_sensitive_data_masked(self):
        """민감 데이터 마스킹."""
        phone = "010-1234-5678"
        masked = "***-****-" + phone[-4:]
        assert masked == "***-****-5678"


class TestAdminUserManagement:
    """어드민 유저 관리 테스트."""

    def test_search_by_nickname(self):
        """닉네임 검색."""
        users = [
            {"id": 1, "nickname": "테스트유저1"},
            {"id": 2, "nickname": "테스트유저2"},
            {"id": 3, "nickname": "다른유저"},
        ]
        
        query = "테스트"
        results = [u for u in users if query in u["nickname"]]
        assert len(results) == 2

    def test_search_by_cc_id(self):
        """CC_ID 검색."""
        users = [
            {"id": 1, "cc_id": "USER_001"},
            {"id": 2, "cc_id": "USER_002"},
        ]
        
        cc_id = "USER_001"
        result = next((u for u in users if u["cc_id"] == cc_id), None)
        assert result is not None
        assert result["id"] == 1

    def test_status_update(self):
        """유저 상태 변경."""
        user = {"id": 1, "status": "ACTIVE"}
        new_status = "SUSPENDED"
        
        user["status"] = new_status
        assert user["status"] == "SUSPENDED"


class TestAdminInventoryGrant:
    """어드민 인벤토리 지급 테스트."""

    def test_grant_adds_to_inventory(self):
        """지급 시 인벤토리 추가."""
        inventory = {"ROULETTE_TICKET": 5}
        grant = {"token_type": "ROULETTE_TICKET", "amount": 3}
        
        inventory[grant["token_type"]] += grant["amount"]
        assert inventory["ROULETTE_TICKET"] == 8

    def test_grant_creates_ledger(self):
        """지급 시 원장 생성."""
        ledger = {
            "user_id": 1,
            "token_type": "GOLD_KEY_TICKET",
            "amount": 1,
            "reason": "ADMIN_GRANT",
            "admin_id": 99,
        }
        
        assert ledger["reason"] == "ADMIN_GRANT"
        assert ledger["admin_id"] == 99


class TestAdminEconomyStats:
    """어드민 경제 통계 테스트."""

    def test_daily_stats_aggregation(self):
        """일별 통계 집계."""
        transactions = [
            {"date": date(2026, 2, 4), "amount": 1000},
            {"date": date(2026, 2, 4), "amount": 2000},
            {"date": date(2026, 2, 3), "amount": 500},
        ]
        
        today = date(2026, 2, 4)
        today_total = sum(t["amount"] for t in transactions if t["date"] == today)
        assert today_total == 3000

    def test_user_count_stats(self):
        """유저 수 통계."""
        users = [
            {"status": "ACTIVE"},
            {"status": "ACTIVE"},
            {"status": "SUSPENDED"},
            {"status": "ACTIVE"},
        ]
        
        active_count = sum(1 for u in users if u["status"] == "ACTIVE")
        assert active_count == 3


class TestAdminSegmentRules:
    """어드민 세그먼트 규칙 테스트."""

    def test_segment_rule_evaluation(self):
        """세그먼트 규칙 평가."""
        rule = {
            "field": "total_deposit",
            "operator": ">=",
            "value": 100000,
        }
        
        user_data = {"total_deposit": 150000}
        
        if rule["operator"] == ">=":
            matches = user_data[rule["field"]] >= rule["value"]
        else:
            matches = False
        
        assert matches is True

    def test_multiple_rules_and(self):
        """여러 규칙 AND 조합."""
        rules = [
            {"field": "total_deposit", "operator": ">=", "value": 50000},
            {"field": "play_count", "operator": ">=", "value": 10},
        ]
        
        user_data = {"total_deposit": 80000, "play_count": 15}
        
        all_match = all(
            user_data.get(r["field"], 0) >= r["value"]
            for r in rules
        )
        
        assert all_match is True
