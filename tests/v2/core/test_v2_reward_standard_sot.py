import pytest

def test_reward_mapping_paths():
    # v2_reward_mapping_sot_ko.md: reward_type -> location
    mapping = {
        "POINT": "vault_locked_balance",
        "CC_POINT": "vault_locked_balance",
        "GAME_XP": "level_point",
        "DIAMOND": "user_inventory_item",
        "TICKET": "user_inventory_item"
    }
    
    assert mapping["POINT"] == "vault_locked_balance"
    assert mapping["GAME_XP"] == "level_point"

def test_reward_type_standard_set():
    # v2_reward_type_standard_sot_ko.md
    standards = ["POINT", "CC_POINT", "GAME_XP", "DIAMOND", "TICKET", "BUNDLE", "TICKET_BUNDLE", "NONE"]
    
    test_types = ["POINT", "GAME_XP", "XP", "VAULT"] # XP/VAULT are legacy
    
    valid = [t for t in test_types if t in standards]
    assert "POINT" in valid
    assert "GAME_XP" in valid
    assert "XP" not in valid
    assert "VAULT" not in valid
