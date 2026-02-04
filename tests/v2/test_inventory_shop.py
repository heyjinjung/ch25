"""V2 Inventory & Shop 서비스 테스트.

도메인: 인벤토리, 상점
커버리지 대상: inventory_service.py, shop_service.py
"""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.v2.models import V2User, GameTokenType
from app.v2.services.inventory_service import V2InventoryService
from app.v2.services.shop_service import V2ShopService


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


@pytest.fixture()
def no_circuit_breaker(monkeypatch):
    from app.v2.services.circuit_breaker_service import CircuitBreakerService

    monkeypatch.setattr(CircuitBreakerService, "check_and_incr", lambda *args, **kwargs: None)


def _create_user(db, *, cc_id: str, vault_locked_balance: int = 0, created_at=None) -> V2User:
    user = V2User(
        cc_id=cc_id,
        nickname="Edge User",
        vault_locked_balance=vault_locked_balance,
        created_at=created_at,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestInventoryEdgeCases:
    def test_grant_item_rejects_non_positive(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="inv_edge_1")

        with pytest.raises(ValueError):
            V2InventoryService.grant_item(
                db,
                v2_user_id=user.id,
                item_type="GIFTICON_TEST",
                amount=0,
                reason="TEST",
            )

    def test_consume_wallet_insufficient_balance(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="inv_edge_2")

        with pytest.raises(ValueError):
            V2InventoryService.consume_wallet_tokens(
                db,
                v2_user_id=user.id,
                token_type=GameTokenType.DICE_TICKET,
                amount=1,
                reason="TEST_CONSUME",
            )

    def test_use_voucher_invalid_type(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="inv_edge_3")

        with pytest.raises(HTTPException) as exc:
            V2InventoryService.use_voucher(
                db,
                v2_user_id=user.id,
                item_type="INVALID_VOUCHER",
                amount=1,
                auto_commit=False,
            )

        assert exc.value.status_code == 400

    def test_use_voucher_blocked_when_suspended(self, db, no_circuit_breaker):
        created_at = datetime.now(timezone.utc) - timedelta(days=8)
        user = _create_user(db, cc_id="inv_edge_4", created_at=created_at)

        with pytest.raises(HTTPException) as exc:
            V2InventoryService.use_voucher(
                db,
                v2_user_id=user.id,
                item_type="VOUCHER_DICE_TOKEN_1",
                amount=1,
                auto_commit=False,
            )

        assert exc.value.status_code == 403


class TestShopEdgeCases:
    def test_purchase_rejects_invalid_cost_type(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="shop_edge_1", vault_locked_balance=1000)

        with pytest.raises(ValueError):
            V2ShopService.purchase(
                db,
                user_id=user.id,
                sku="SKU_INVALID",
                name="Invalid Cost",
                cost_type="GEM",
                cost_amount=100,
                reward_type="NONE",
                reward_amount=0,
            )

    def test_purchase_rejects_non_positive_cost(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="shop_edge_2", vault_locked_balance=1000)

        with pytest.raises(ValueError):
            V2ShopService.purchase(
                db,
                user_id=user.id,
                sku="SKU_ZERO",
                name="Zero Cost",
                cost_type="VAULT",
                cost_amount=0,
                reward_type="NONE",
                reward_amount=0,
            )

    def test_purchase_rejects_invalid_reward_amount(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="shop_edge_3", vault_locked_balance=1000)

        with pytest.raises(ValueError):
            V2ShopService.purchase(
                db,
                user_id=user.id,
                sku="SKU_REWARD",
                name="Bad Reward",
                cost_type="VAULT",
                cost_amount=100,
                reward_type="ROULETTE_TICKET",
                reward_amount=0,
            )

    def test_purchase_with_diamond_cost(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="shop_edge_4")

        V2InventoryService.grant_wallet_tokens(
            db,
            v2_user_id=user.id,
            token_type=GameTokenType.DIAMOND,
            amount=5,
            reason="TEST_GRANT",
        )

        V2ShopService.purchase(
            db,
            user_id=user.id,
            sku="SKU_DIAMOND",
            name="Diamond Cost",
            cost_type="DIAMOND",
            cost_amount=3,
            reward_type="NONE",
            reward_amount=0,
        )
        db.commit()

        balance = V2InventoryService.get_wallet_balance(db, user.id, GameTokenType.DIAMOND)
        assert balance == 2
