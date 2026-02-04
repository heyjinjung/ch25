"""V2 Reward 서비스 테스트.

도메인: 보상 지급
커버리지 대상: reward_service.py
SoT 문서: v2_reward_mapping_sot_ko.md
"""
import pytest

from app.v2.models import V2User, GameTokenType
from app.v2.services.inventory_service import V2InventoryService
from app.v2.services.reward_service import V2RewardService


@pytest.fixture()
def no_circuit_breaker(monkeypatch):
    from app.v2.services.circuit_breaker_service import CircuitBreakerService

    monkeypatch.setattr(CircuitBreakerService, "check_and_incr", lambda *args, **kwargs: None)


def _create_user(db, *, cc_id: str = "reward_user") -> V2User:
    user = V2User(cc_id=cc_id, nickname="Reward User")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestRewardServiceReal:
    def test_deliver_point_updates_vault(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="reward_user_1")
        service = V2RewardService()

        service.deliver(
            db,
            user_id=user.id,
            reward_type="POINT",
            reward_amount=1000,
            meta={"reason": "TEST_POINT"},
        )

        refreshed = db.get(V2User, user.id)
        assert refreshed.vault_locked_balance == 1000

    def test_deliver_ticket_reward(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="reward_user_2")
        service = V2RewardService()

        service.deliver(
            db,
            user_id=user.id,
            reward_type="ROULETTE_TICKET",
            reward_amount=3,
            meta={"reason": "TEST_TICKET"},
        )

        balance = V2InventoryService.get_wallet_balance(db, user.id, GameTokenType.ROULETTE_TICKET)
        assert balance == 3

    def test_deliver_bundle_reward(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="reward_user_3")
        service = V2RewardService()

        service.deliver(
            db,
            user_id=user.id,
            reward_type="BUNDLE",
            reward_amount=3,
            meta={"reason": "TEST_BUNDLE"},
        )

        roulette = V2InventoryService.get_wallet_balance(db, user.id, GameTokenType.ROULETTE_TICKET)
        dice = V2InventoryService.get_wallet_balance(db, user.id, GameTokenType.DICE_TICKET)
        lottery = V2InventoryService.get_wallet_balance(db, user.id, GameTokenType.LOTTERY_TICKET)

        assert roulette == 1
        assert dice == 1
        assert lottery == 1
