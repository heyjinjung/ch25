"""Deep Inventory SOT Compliance Tests.

Reference SOT Documents:
01. v2_economy_asset_storage_sot_ko.md
02. v2_reward_type_and_delivery_routing_sot_ko.md
03. v2_game_token_type_sot_ko.md
04. v2_inventory_item_type_and_gifticon_sot_ko.md
05. v2_ticket_enum_and_legacy_mapping_sot_ko.md
"""
import pytest
from sqlalchemy.orm import Session
from app.v2.models import V2User, GameTokenType, UserGameWallet
from app.v2.services.reward_service import V2RewardService
from app.v2.services.inventory_service import V2InventoryService

@pytest.fixture()
def reward_service():
    return V2RewardService()

@pytest.fixture()
def inventory_service():
    return V2InventoryService()

@pytest.fixture()
def no_circuit_breaker(monkeypatch):
    from app.v2.services.circuit_breaker_service import CircuitBreakerService
    monkeypatch.setattr(CircuitBreakerService, "check_and_incr", lambda *args, **kwargs: None)

def _create_v2_user(db: Session, cc_id: str) -> V2User:
    user = V2User(cc_id=cc_id, nickname=f"SOT_USER_{cc_id}")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

class TestSOT01EconomyAssetStorage:
    """SOT-01: Asset classification and storage SoT."""
    
    def test_vault_routing_point(self, db, reward_service, no_circuit_breaker):
        """POINT reward must be routed to user.vault_locked_balance."""
        user = _create_v2_user(db, "sot01_1")
        reward_service.deliver(db, user.id, "POINT", 1000)
        
        db.refresh(user)
        assert user.vault_locked_balance == 1000

    def test_vault_routing_cc_point(self, db, reward_service, no_circuit_breaker):
        """CC_POINT reward must be routed to user.vault_locked_balance."""
        user = _create_v2_user(db, "sot01_2")
        reward_service.deliver(db, user.id, "CC_POINT", 5000)
        
        db.refresh(user)
        assert user.vault_locked_balance == 5000

class TestSOT02RewardRoutingAndBundles:
    """SOT-02: RewardType routing and bundle expansion rules."""
    
    @pytest.mark.parametrize("bundle_id, expected_vault, expected_tokens", [
        (3, 0, {GameTokenType.ROULETTE_TICKET: 1, GameTokenType.DICE_TICKET: 1, GameTokenType.LOTTERY_TICKET: 1}),
        (6, 0, {GameTokenType.ROULETTE_TICKET: 3, GameTokenType.DICE_TICKET: 3}),
        (7, 10000, {GameTokenType.GOLD_KEY_TICKET: 1}),
        (12, 0, {GameTokenType.ROULETTE_TICKET: 5, GameTokenType.DICE_TICKET: 5, GameTokenType.LOTTERY_TICKET: 2}),
        (15, 100000, {GameTokenType.GOLD_KEY_TICKET: 2}),
        (30, 0, {GameTokenType.ROULETTE_TICKET: 10, GameTokenType.DICE_TICKET: 10, GameTokenType.LOTTERY_TICKET: 10}),
        (20, 300000, {GameTokenType.DIAMOND_TICKET: 3}),
        (4, 0, {GameTokenType.ROULETTE_TICKET: 2, GameTokenType.DICE_TICKET: 2}),
    ])
    def test_bundle_expansion(self, db, reward_service, no_circuit_breaker, bundle_id, expected_vault, expected_tokens):
        """Verify all bundle IDs expand correctly according to SOT-02 and implementation."""
        user = _create_v2_user(db, f"bundle_{bundle_id}")
        reward_service.deliver(db, user.id, "BUNDLE", bundle_id)
        
        db.refresh(user)
        assert user.vault_locked_balance == expected_vault
        
        for token_type, expected_amount in expected_tokens.items():
            balance = V2InventoryService.get_wallet_balance(db, user.id, token_type)
            assert balance == expected_amount

class TestSOT03TokenTypesAndLegacy:
    """SOT-03 & SOT-05: Standard token types and legacy name mapping."""
    
    @pytest.mark.parametrize("legacy_type, standard_enum", [
        ("ROULETTE_COIN", GameTokenType.ROULETTE_TICKET),
        ("DICE_TOKEN", GameTokenType.DICE_TICKET),
        ("GOLD_KEY", GameTokenType.GOLD_KEY_TICKET),
        ("DIAMOND_KEY", GameTokenType.DIAMOND_TICKET),
    ])
    def test_legacy_reward_mapping(self, db, reward_service, no_circuit_breaker, legacy_type, standard_enum):
        """Verify legacy reward types map to standard tokens."""
        user = _create_v2_user(db, f"legacy_{legacy_type}")
        reward_service.deliver(db, user.id, legacy_type, 1)
        
        balance = V2InventoryService.get_wallet_balance(db, user.id, standard_enum)
        assert balance == 1

class TestSOT04InventoryAndGifticons:
    """SOT-04: Inventory ItemType and Gifticon naming."""
    
    def test_gifticon_delivery_routing(self, db, reward_service, no_circuit_breaker):
        """Verify that GIFTICON_* reward types land in user_inventory_item."""
        user = _create_v2_user(db, "gifticon_1")
        reward_service.deliver(db, user.id, "CHICKEN_GIFTICON_10000", 1)
        
        items = V2InventoryService.get_inventory(db, user.id)
        assert len(items) == 1
        assert items[0].item_type == "CHICKEN_GIFTICON_10000"
        assert items[0].quantity == 1

    def test_baemin_gifticon_special_handling(self, db, reward_service, no_circuit_breaker):
        """Verify BAEMIN gifticon specific logic in reward service."""
        user = _create_v2_user(db, "baemin_1")
        reward_service.deliver(db, user.id, "GIFTICON_BAEMIN", 5000)
        
        items = V2InventoryService.get_inventory(db, user.id)
        assert items[0].item_type == "BAEMIN_GIFTICON_5000"

class TestInventoryComplexLogic:
    """Additional deep logic tests from implementation discovery."""
    
    def test_trial_token_priority_consumption(self, db, inventory_service, no_circuit_breaker):
        """Verify that trial tokens are consumed before normal wallet tokens."""
        user = _create_v2_user(db, "trial_priority")
        
        # 1. Grant 5 normal tokens
        inventory_service.grant_wallet_tokens(db, user.id, GameTokenType.ROULETTE_TICKET, 5)
        
        # 2. Directly add 3 trial tokens to bucket (simulating grant)
        from app.v2.models import TrialTokenBucket
        bucket = TrialTokenBucket(user_id=user.id, token_type=GameTokenType.ROULETTE_TICKET, balance=3)
        db.add(bucket)
        db.commit()
        
        # 3. Consume 2 tokens
        balance_after, was_trial = inventory_service.require_and_consume_wallet_token(db, user.id, GameTokenType.ROULETTE_TICKET, 2)
        
        assert balance_after == 3
        assert was_trial is True
        
        db.refresh(bucket)
        assert bucket.balance == 1

    def test_puzzle_c_randomization(self, db, reward_service, no_circuit_breaker):
        """Verify PUZZLE_C reward type randomizes between C1 and C2."""
        user = _create_v2_user(db, "puzzle_rand")
        
        # Grant multiple times to see both outcomes
        for _ in range(20):
            reward_service.deliver(db, user.id, "PUZZLE_C", 1)
        
        c1_balance = V2InventoryService.get_wallet_balance(db, user.id, GameTokenType.PUZZLE_C1)
        c2_balance = V2InventoryService.get_wallet_balance(db, user.id, GameTokenType.PUZZLE_C2)
        
        assert c1_balance + c2_balance == 20
        assert c1_balance > 0
        assert c2_balance > 0
