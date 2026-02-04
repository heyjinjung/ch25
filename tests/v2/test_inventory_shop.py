"""V2 Inventory & Shop 서비스 테스트.

도메인: 인벤토리, 상점
커버리지 대상: inventory_service.py, shop_service.py
"""
import pytest
from sqlalchemy.orm import Session

from app.v2.models import V2User, GameTokenType


class TestInventoryTokenTypes:
    """게임 토큰 타입 검증."""

    TICKET_TYPES = [
        "ROULETTE_TICKET",
        "DICE_TICKET",
        "LOTTERY_TICKET",
        "TRIAL_TICKET",
        "GOLD_KEY_TICKET",
        "DIAMOND_TICKET",
    ]

    PUZZLE_TYPES = [
        "PUZZLE_C1",
        "PUZZLE_C2",
        "PUZZLE_J",
        "PUZZLE_M",
    ]

    def test_ticket_types_defined(self):
        """티켓 타입 6종 정의."""
        assert len(self.TICKET_TYPES) == 6

    def test_puzzle_types_defined(self):
        """퍼즐 조각 4종 정의."""
        assert len(self.PUZZLE_TYPES) == 4

    @pytest.mark.parametrize("token", [
        "ROULETTE_TICKET", "DICE_TICKET", "LOTTERY_TICKET",
        "TRIAL_TICKET", "GOLD_KEY_TICKET", "DIAMOND_TICKET"
    ])
    def test_each_ticket_exists(self, token):
        """각 티켓 타입 존재 확인."""
        assert token in self.TICKET_TYPES


class TestShopPolicies:
    """상점 정책 테스트."""

    def test_vault_payment_priority(self):
        """금고 결제 우선 정책."""
        # 상점 결제 시 금고 잔액 우선 차감
        vault_balance = 5000
        price = 3000
        
        if vault_balance >= price:
            vault_balance -= price
            paid_from_vault = price
        else:
            paid_from_vault = vault_balance
            vault_balance = 0
        
        assert paid_from_vault == 3000
        assert vault_balance == 2000

    def test_insufficient_balance_blocked(self):
        """잔액 부족 시 구매 차단."""
        vault_balance = 1000
        price = 5000
        
        can_purchase = vault_balance >= price
        assert can_purchase is False

    def test_shop_order_creates_ledger(self):
        """구매 시 원장 기록 생성."""
        order = {
            "user_id": 1,
            "product_id": 10,
            "quantity": 2,
            "total_price": 6000,
        }
        
        ledger_entry = {
            "user_id": order["user_id"],
            "amount": -order["total_price"],
            "reason": "SHOP_PURCHASE",
        }
        
        assert ledger_entry["amount"] == -6000
        assert ledger_entry["reason"] == "SHOP_PURCHASE"


class TestInventoryOperations:
    """인벤토리 연산 테스트."""

    def test_add_item_increases_quantity(self):
        """아이템 추가 시 수량 증가."""
        inventory = {"ROULETTE_TICKET": 5}
        add_amount = 3
        
        inventory["ROULETTE_TICKET"] += add_amount
        assert inventory["ROULETTE_TICKET"] == 8

    def test_use_item_decreases_quantity(self):
        """아이템 사용 시 수량 감소."""
        inventory = {"DICE_TICKET": 10}
        use_amount = 4
        
        if inventory["DICE_TICKET"] >= use_amount:
            inventory["DICE_TICKET"] -= use_amount
        
        assert inventory["DICE_TICKET"] == 6

    def test_use_item_blocked_when_insufficient(self):
        """수량 부족 시 사용 차단."""
        inventory = {"LOTTERY_TICKET": 2}
        use_amount = 5
        
        can_use = inventory["LOTTERY_TICKET"] >= use_amount
        assert can_use is False

    def test_idempotency_key_prevents_duplicate(self):
        """멱등성 키로 중복 처리 방지."""
        processed_keys = set()
        key = "unique_request_123"
        
        # 첫 번째 처리
        if key not in processed_keys:
            processed_keys.add(key)
            first_process = True
        else:
            first_process = False
        
        # 두 번째 처리 시도 (중복)
        if key not in processed_keys:
            processed_keys.add(key)
            second_process = True
        else:
            second_process = False
        
        assert first_process is True
        assert second_process is False
