"""V2 Inventory & Shop 서비스 테스트.

도메인: 인벤토리, 상점
커버리지 대상: inventory_service.py, shop_service.py
"""
from datetime import datetime, timedelta, timezone

import pytest

from app.v2.models import V2User, GameTokenType
from app.v2.services.inventory_service import V2InventoryService
from app.v2.services.shop_service import V2ShopService


@pytest.fixture()
def no_circuit_breaker(monkeypatch):
    from app.v2.services.circuit_breaker_service import CircuitBreakerService

    monkeypatch.setattr(CircuitBreakerService, "check_and_incr", lambda *args, **kwargs: None)


def _create_user(db, *, cc_id: str = "test_user", vault_locked_balance: int = 0, created_at=None) -> V2User:
    user = V2User(
        cc_id=cc_id,
        nickname="Test User",
        vault_locked_balance=vault_locked_balance,
        created_at=created_at,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestInventoryServiceReal:
    def test_wallet_grant_and_consume(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="wallet_user")

        V2InventoryService.grant_wallet_tokens(
            db,
            v2_user_id=user.id,
            token_type=GameTokenType.DICE_TICKET,
            amount=5,
            reason="TEST_GRANT",
        )
        balance = V2InventoryService.get_wallet_balance(db, user.id, GameTokenType.DICE_TICKET)
        assert balance == 5

        V2InventoryService.consume_wallet_tokens(
            db,
            v2_user_id=user.id,
            token_type=GameTokenType.DICE_TICKET,
            amount=2,
            reason="TEST_CONSUME",
        )
        balance_after = V2InventoryService.get_wallet_balance(db, user.id, GameTokenType.DICE_TICKET)
        assert balance_after == 3

    def test_item_grant_and_consume(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="item_user")

        item = V2InventoryService.grant_item(
            db,
            v2_user_id=user.id,
            item_type="GIFTICON_TEST",
            amount=2,
            reason="TEST_GRANT",
        )
        assert item.quantity == 2

        item_after = V2InventoryService.consume_item(
            db,
            v2_user_id=user.id,
            item_type="GIFTICON_TEST",
            amount=1,
            reason="TEST_CONSUME",
        )
        assert item_after.quantity == 1


class TestShopServiceReal:
    def test_shop_purchase_consumes_vault(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="shop_user", vault_locked_balance=10000)

        order = V2ShopService.purchase(
            db,
            user_id=user.id,
            sku="SKU_TEST_1",
            name="Test Product",
            cost_type="VAULT",
            cost_amount=3000,
            reward_type="NONE",
            reward_amount=0,
        )
        db.commit()

        refreshed = db.get(V2User, user.id)
        assert refreshed.vault_locked_balance == 7000
        assert refreshed.vault_spent_total == 3000
        assert refreshed.vault_spent_today == 3000
        assert order.sku == "SKU_TEST_1"

    def test_shop_purchase_blocked_when_suspended(self, db, no_circuit_breaker):
        created_at = datetime.now(timezone.utc) - timedelta(days=8)
        user = _create_user(
            db,
            cc_id="suspended_user",
            vault_locked_balance=10000,
            created_at=created_at,
        )

        with pytest.raises(ValueError) as exc:
            V2ShopService.purchase(
                db,
                user_id=user.id,
                sku="SKU_TEST_2",
                name="Blocked Product",
                cost_type="VAULT",
                cost_amount=1000,
                reward_type="NONE",
                reward_amount=0,
            )

        assert "BENEFITS_SUSPENDED" in str(exc.value)

    def test_shop_grant_reward_wallet(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="reward_user")

        V2ShopService.grant_reward(
            db,
            user_id=user.id,
            reward_type="ROULETTE_TICKET",
            reward_amount=2,
        )
        db.commit()

        balance = V2InventoryService.get_wallet_balance(db, user.id, GameTokenType.ROULETTE_TICKET)
        assert balance == 2
