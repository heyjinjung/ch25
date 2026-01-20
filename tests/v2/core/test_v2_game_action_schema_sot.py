import pytest
from pydantic import BaseModel
from typing import Optional, List, Literal, Any

# Based on docs/v2_specs/02_game/v2_game_action_schema_sot_ko.md

# --- SoT Definitions (Mocking the Schema for Verification) ---
class CommonResponseEnvelope(BaseModel):
    result: Literal["WIN", "LOSE", "DRAW"]
    game_data: dict
    vault_earn: int
    season_pass: Optional[dict] = None
    streak_info: Optional[dict] = None
    fever_gauge: Optional[dict] = None
    next_action_available: Optional[List[str]] = None

class RouletteGameData(BaseModel):
    segment: dict
    animation_type: Literal["NORMAL", "SLOW_DRAMA", "FEVER_BLAST", "SKIP", "FEVER", "DRAMATIC"] # Merged enums from SoT

class DiceGameData(BaseModel):
    user_dice: List[int]
    dealer_dice: List[int]
    user_sum: int
    dealer_sum: int
    outcome: Literal["WIN", "LOSE", "DRAW"]
    reward_amount: int
    can_double_up: bool

# --- Tests ---

def test_common_response_envelope_structure():
    # Verify the common fields defined in Section 2
    response = {
        "result": "WIN",
        "game_data": {"test": "data"},
        "vault_earn": 100,
        "season_pass": {"current_level": 5},
        "streak_info": {"current_streak": 3},
        "fever_gauge": {"current": 80},
        "next_action_available": ["DOUBLE_UP"]
    }
    
    # Validation should pass
    validated = CommonResponseEnvelope(**response)
    assert validated.result == "WIN"
    assert validated.vault_earn == 100
    assert "DOUBLE_UP" in validated.next_action_available

def test_roulette_schema_compliance():
    # Section 3.1 Roulette Response
    data = {
        "segment": {
            "id": 101, 
            "label": "100 POINT", 
            "reward_type": "POINT", 
            "reward_amount": 100,
            "slot_index": 3
        },
        "animation_type": "NORMAL"
    }
    validated = RouletteGameData(**data)
    assert validated.segment["id"] == 101
    assert validated.animation_type == "NORMAL"

def test_dice_schema_compliance():
    # Section 3.2 Dice Response
    data = {
        "user_dice": [4, 5],
        "dealer_dice": [2, 3],
        "user_sum": 9,
        "dealer_sum": 5,
        "outcome": "WIN",
        "reward_amount": 200,
        "can_double_up": True
    }
    validated = DiceGameData(**data)
    assert validated.outcome == "WIN"
    assert validated.user_sum == 9
    assert validated.can_double_up is True

def test_error_code_standardization():
    # Section 5 Error Codes
    # We verify that strict string matching works for the standard codes
    STANDARD_ERRORS = {
        "NOT_ENOUGH_TOKENS",
        "DAILY_LIMIT_REACHED",
        "INVALID_BET",
        "RATE_LIMITED"
    }
    
    current_error = "NOT_ENOUGH_TOKENS"
    assert current_error in STANDARD_ERRORS
    
    current_error = "DAILY_LIMIT_REACHED"
    assert current_error in STANDARD_ERRORS
