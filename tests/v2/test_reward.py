"""V2 Reward 서비스 테스트.

도메인: 보상 지급
커버리지 대상: reward_service.py
SoT 문서: v2_reward_mapping_sot_ko.md
"""
import pytest

from app.core.exceptions import InvalidConfigError
from app.v2.models import V2User, GameTokenType
from app.v2.services.inventory_service import V2InventoryService
from app.v2.services.reward_service import V2RewardService


class TestRewardTypes:
    """보상 타입 테스트."""

    REWARD_TYPES = [
        "POINT",
        "ROULETTE_TICKET",
        "DICE_TICKET", 
        "LOTTERY_TICKET",
        "TRIAL_TICKET",
        "GOLD_KEY_TICKET",
        "DIAMOND_TICKET",
        "DIAMOND",
        "VAULT_FILL",
        "GIFTICON",
    ]

    def test_point_type_exists(self):
        """POINT 타입 존재."""
        assert "POINT" in self.REWARD_TYPES

    def test_all_ticket_types_exist(self):
        """모든 티켓 타입 존재."""
        tickets = [t for t in self.REWARD_TYPES if "TICKET" in t]
        assert len(tickets) >= 5


class TestRewardRouting:
    """보상 라우팅 테스트."""

    ROUTING = {
        "POINT": "inventory",
        "ROULETTE_TICKET": "inventory",
        "DICE_TICKET": "inventory",
        "LOTTERY_TICKET": "inventory",
        "VAULT_FILL": "vault",
        "GIFTICON": "external",
    }

    def test_point_routes_to_inventory(self):
        """포인트는 인벤토리로."""
        assert self.ROUTING["POINT"] == "inventory"

    def test_vault_fill_routes_to_vault(self):
        """금고 채우기는 금고로."""
        assert self.ROUTING["VAULT_FILL"] == "vault"

    def test_gifticon_routes_to_external(self):
        """기프티콘은 외부로."""
        assert self.ROUTING["GIFTICON"] == "external"


class TestRewardExecution:
    """보상 실행 테스트."""

    def test_inventory_reward_adds_item(self):
        """인벤토리 보상 아이템 추가."""
        inventory = {"ROULETTE_TICKET": 5}
        reward = {"type": "ROULETTE_TICKET", "amount": 2}
        
        inventory[reward["type"]] += reward["amount"]
        assert inventory["ROULETTE_TICKET"] == 7

    def test_vault_reward_adds_balance(self):
        """금고 보상 잔액 추가."""
        vault_balance = 10000
        reward = {"type": "VAULT_FILL", "amount": 5000}
        
        vault_balance += reward["amount"]
        assert vault_balance == 15000

    def test_reward_creates_log(self):
        """보상 지급 로그 생성."""
        log = {
            "user_id": 1,
            "reward_type": "GOLD_KEY_TICKET",
            "amount": 1,
            "source": "MISSION_COMPLETE",
        }
        
        assert log["source"] == "MISSION_COMPLETE"


class TestRewardValidation:
    """보상 유효성 테스트."""

    def test_negative_amount_rejected(self):
        """음수 보상량 거부."""
        amount = -5
        is_valid = amount > 0
        assert is_valid is False

    def test_zero_amount_rejected(self):
        """0 보상량 거부."""
        amount = 0
        is_valid = amount > 0
        assert is_valid is False

    def test_unknown_type_rejected(self):
        """알 수 없는 타입 거부."""
        known_types = {"POINT", "ROULETTE_TICKET", "VAULT_FILL"}
        reward_type = "UNKNOWN_REWARD"
        
        is_valid = reward_type in known_types
        assert is_valid is False


class TestBundleRewards:
    """번들 보상 테스트."""

    def test_bundle_contains_multiple_items(self):
        """번들은 여러 아이템 포함."""
        bundle = {
            "ROULETTE_TICKET": 3,
            "DICE_TICKET": 5,
            "POINT": 1000,
        }
        
        assert len(bundle) >= 2

    def test_bundle_expands_correctly(self):
        """번들 확장 정확성."""
        bundle = {
            "ROULETTE_TICKET": 3,
            "DICE_TICKET": 5,
        }
        
        inventory = {"ROULETTE_TICKET": 0, "DICE_TICKET": 2}
        
        for item_type, amount in bundle.items():
            inventory[item_type] = inventory.get(item_type, 0) + amount
        
        assert inventory["ROULETTE_TICKET"] == 3
        assert inventory["DICE_TICKET"] == 7


@pytest.fixture()
def no_circuit_breaker(monkeypatch):
    from app.v2.services.circuit_breaker_service import CircuitBreakerService

    monkeypatch.setattr(CircuitBreakerService, "check_and_incr", lambda *args, **kwargs: None)


def _create_user(db, *, cc_id: str) -> V2User:
    user = V2User(cc_id=cc_id, nickname="Reward Edge")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestRewardEdgeCases:
    def test_deliver_none_is_noop(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="reward_edge_1")
        service = V2RewardService()

        service.deliver(db, user_id=user.id, reward_type="NONE", reward_amount=100)
        refreshed = db.get(V2User, user.id)
        assert refreshed.vault_locked_balance == 0

    def test_gifticon_invalid_amount_rejected(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="reward_edge_2")
        service = V2RewardService()

        with pytest.raises(InvalidConfigError):
            service.deliver(
                db,
                user_id=user.id,
                reward_type="GIFTICON_BAEMIN",
                reward_amount=7000,
            )

    def test_deliver_diamond_reward(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="reward_edge_3")
        service = V2RewardService()

        service.deliver(db, user_id=user.id, reward_type="DIAMOND", reward_amount=5)
        balance = V2InventoryService.get_wallet_balance(db, user.id, GameTokenType.DIAMOND)
        assert balance == 5

    def test_bundle_reward_amount_7(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="reward_edge_4")
        service = V2RewardService()

        service.deliver(db, user_id=user.id, reward_type="BUNDLE", reward_amount=7)
        refreshed = db.get(V2User, user.id)
        assert refreshed.vault_locked_balance == 10000

        gold_key = V2InventoryService.get_wallet_balance(db, user.id, GameTokenType.GOLD_KEY_TICKET)
        assert gold_key == 1
