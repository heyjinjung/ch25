import pytest
from app.models.game_wallet import GameTokenType

def test_game_token_type_sot_compliance():
    """
    SoT(v2_item_inventory_sot_ko.md) 및 v2_reward_type_standard_sot_ko.md에 정의된
    보상 아이템 표준을 GameTokenType Enum이 준수하는지 검증.
    """
    
    # 1. SoT에 정의된 V2 표준 토큰 목록 (Total: 19)
    # Reference: docs/v2_specs/01_core/v2_item_inventory_sot_ko.md
    expected_v2_tokens = {
        # Game Tickets (3)
        "ROULETTE_TICKET",
        "DICE_TICKET",
        "LOTTERY_TICKET",
        
        # Vault (Virtual Token) (1)
        "VAULT",
        
        # Premium Tickets (2)
        "GOLD_KEY_TICKET",
        "DIAMOND_TICKET",
        
        # Fragments (2)
        "GOLD_KEY_FRAGMENT",
        "DIAMOND_FRAGMENT",
        
        # Puzzle Pieces (4)
        "PUZZLE_C1",
        "PUZZLE_C2",
        "PUZZLE_J",
        "PUZZLE_M",
        
        # Currency (1)
        "DIAMOND",
        
        # Special (NONE is not a wallet token)
        #"NONE",
                
        # Legacy Aliases (Supported for Migration) - Check existence
        "ROULETTE_COIN",
        "DICE_TOKEN",
        "GOLD_KEY",
        "DIAMOND_KEY",
        "DIAMOND_KEY_FRAGMENT",
        "PUZZLE_C", 
        "TRIAL_TOKEN"
    }

    # 2. 실제 Enum 멤버 확인
    actual_tokens = set(GameTokenType.__members__.keys())
    
    # 3. 누락된 토큰 확인
    missing_tokens = expected_v2_tokens - actual_tokens
    assert not missing_tokens, f"Missing tokens in GameTokenType: {missing_tokens}"
    
    # 4. 불필요한/정의되지 않은 토큰 확인 (Strict Mode)
    # 만약 SoT에 없는게 코드에 있다면 실패해야 함
    unknown_tokens = actual_tokens - expected_v2_tokens
    assert not unknown_tokens, f"Unknown tokens found in GameTokenType (Not in SoT): {unknown_tokens}"

def test_legacy_alias_mapping():
    """
    마이그레이션을 위한 Legacy Alias가 올바른 값을 가리키는지(혹은 존재하는지) 확인.
    DB 마이그레이션 스크립트에서 사용되는 매핑의 유효성 검증.
    """
    # V1 Name -> V2 Name 매핑 검증
    # 주의: Enum 자체는 문자열 값을 가지므로, V1 키가 V1 값을 가지는지, 
    # 혹은 V2 값을 가지도록 리팩토링 되었는지 확인.
    # 현재 구현상 GameTokenType은 str Enum이고, 
    # ROULETTE_COIN = "ROULETTE_COIN" (Legacy value) 으로 유지됨.
    
    assert GameTokenType.ROULETTE_COIN.value == "ROULETTE_COIN"
    assert GameTokenType.DICE_TOKEN.value == "DICE_TOKEN"
    assert GameTokenType.GOLD_KEY.value == "GOLD_KEY"
    assert GameTokenType.DIAMOND_KEY.value == "DIAMOND_KEY"
    assert GameTokenType.DIAMOND_KEY_FRAGMENT.value == "DIAMOND_KEY_FRAGMENT"

def test_v2_standard_values():
    """
    V2 표준 토큰들의 실제 문자열 값이 예상과 일치하는지 검증.
    """
    assert GameTokenType.ROULETTE_TICKET.value == "ROULETTE_TICKET"
    assert GameTokenType.DICE_TICKET.value == "DICE_TICKET"
    assert GameTokenType.GOLD_KEY_TICKET.value == "GOLD_KEY_TICKET"
    assert GameTokenType.DIAMOND_TICKET.value == "DIAMOND_TICKET"
    assert GameTokenType.DIAMOND_FRAGMENT.value == "DIAMOND_FRAGMENT"
    assert GameTokenType.VAULT.value == "VAULT"
    # assert GameTokenType.NONE.value == "NONE"
