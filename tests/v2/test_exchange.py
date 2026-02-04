"""V2 Exchange 서비스 테스트.

도메인: 토큰 교환, 퍼즐 합체
커버리지 대상: v2_exchange_service.py
"""
import pytest

from app.v2.models import V2User, GameTokenType
from app.v2.services.inventory_service import V2InventoryService
from app.v2.services.v2_exchange_service import V2ExchangeService


@pytest.fixture()
def no_circuit_breaker(monkeypatch):
    from app.v2.services.circuit_breaker_service import CircuitBreakerService

    monkeypatch.setattr(CircuitBreakerService, "check_and_incr", lambda *args, **kwargs: None)


def _create_user(db, *, cc_id: str = "exchange_user") -> V2User:
    user = V2User(cc_id=cc_id, nickname="Exchange User")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestExchangeServiceReal:
    def test_get_craft_status_insufficient(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="exchange_user_1")

        status = V2ExchangeService.get_craft_status(db, user.id)
        assert status["can_craft"] is False

    def test_craft_puzzle_to_gold_key(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="exchange_user_2")

        for token_type in [
            GameTokenType.PUZZLE_C1,
            GameTokenType.PUZZLE_C2,
            GameTokenType.PUZZLE_J,
            GameTokenType.PUZZLE_M,
        ]:
            V2InventoryService.grant_wallet_tokens(
                db,
                v2_user_id=user.id,
                token_type=token_type,
                amount=1,
                reason="TEST_GRANT",
            )

        result = V2ExchangeService.craft_puzzle_to_gold_key(db, user.id)
        assert result["result"] == "OK"
        assert result["reward_token"] == "GOLD_KEY_TICKET"

        reward_balance = V2InventoryService.get_wallet_balance(db, user.id, GameTokenType.GOLD_KEY_TICKET)
        assert reward_balance == 1
