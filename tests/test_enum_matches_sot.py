"""Enum SoT Consistency Test (03_enum_naming_consistency.md).

이 테스트는 코드베이스의 Enum/Literal 정의가 SoT JSON 파일과 일치하는지 검증합니다.
CI에서 실행되어 Enum drift를 방지합니다.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import get_args

import pytest


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture(scope="module")
def canonical_enums() -> dict:
    """Load canonical enum definitions from SoT JSON."""
    json_path = Path(__file__).parent.parent / "docs" / "soT" / "canonical_enums" / "shop_enums.json"
    if not json_path.exists():
        pytest.skip(f"Canonical enums file not found: {json_path}")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("enums", {})


# =============================================================================
# Tests - v2_constants.py Literals vs SoT JSON
# =============================================================================

def test_reward_type_matches_sot(canonical_enums: dict):
    """RewardType Literal이 SoT JSON과 일치하는지 검증."""
    from app.v2.schemas.v2_constants import RewardType
    
    code_values = set(get_args(RewardType))
    sot_values = set(canonical_enums.get("RewardType", []))
    
    # 코드에만 있는 값
    only_in_code = code_values - sot_values
    # SoT에만 있는 값
    only_in_sot = sot_values - code_values
    
    assert not only_in_code, f"RewardType values only in code (not in SoT): {only_in_code}"
    assert not only_in_sot, f"RewardType values only in SoT (not in code): {only_in_sot}"


def test_ticket_type_matches_sot(canonical_enums: dict):
    """TicketType Literal이 SoT JSON과 일치하는지 검증."""
    from app.v2.schemas.v2_constants import TicketType
    
    code_values = set(get_args(TicketType))
    sot_values = set(canonical_enums.get("TicketType", []))
    
    only_in_code = code_values - sot_values
    only_in_sot = sot_values - code_values
    
    assert not only_in_code, f"TicketType values only in code (not in SoT): {only_in_code}"
    assert not only_in_sot, f"TicketType values only in SoT (not in code): {only_in_sot}"


def test_game_token_type_matches_sot(canonical_enums: dict):
    """GameTokenTypeLiteral이 SoT JSON과 일치하는지 검증."""
    from app.v2.schemas.v2_constants import GameTokenTypeLiteral
    
    code_values = set(get_args(GameTokenTypeLiteral))
    sot_values = set(canonical_enums.get("GameTokenType", []))
    
    only_in_code = code_values - sot_values
    only_in_sot = sot_values - code_values
    
    assert not only_in_code, f"GameTokenType values only in code (not in SoT): {only_in_code}"
    assert not only_in_sot, f"GameTokenType values only in SoT (not in code): {only_in_sot}"


def test_roulette_grade_matches_sot(canonical_enums: dict):
    """RouletteGrade Literal이 SoT JSON과 일치하는지 검증."""
    from app.v2.schemas.v2_constants import RouletteGrade
    
    code_values = set(get_args(RouletteGrade))
    sot_values = set(canonical_enums.get("RouletteGrade", []))
    
    only_in_code = code_values - sot_values
    only_in_sot = sot_values - code_values
    
    assert not only_in_code, f"RouletteGrade values only in code (not in SoT): {only_in_code}"
    assert not only_in_sot, f"RouletteGrade values only in SoT (not in code): {only_in_sot}"


def test_animation_type_matches_sot(canonical_enums: dict):
    """AnimationType Literal이 SoT JSON과 일치하는지 검증."""
    from app.v2.schemas.v2_constants import AnimationType
    
    code_values = set(get_args(AnimationType))
    sot_values = set(canonical_enums.get("AnimationType", []))
    
    only_in_code = code_values - sot_values
    only_in_sot = sot_values - code_values
    
    assert not only_in_code, f"AnimationType values only in code (not in SoT): {only_in_code}"
    assert not only_in_sot, f"AnimationType values only in SoT (not in code): {only_in_sot}"


def test_game_result_matches_sot(canonical_enums: dict):
    """GameResult Literal이 SoT JSON과 일치하는지 검증."""
    from app.v2.schemas.v2_constants import GameResult
    
    code_values = set(get_args(GameResult))
    sot_values = set(canonical_enums.get("GameResult", []))
    
    only_in_code = code_values - sot_values
    only_in_sot = sot_values - code_values
    
    assert not only_in_code, f"GameResult values only in code (not in SoT): {only_in_code}"
    assert not only_in_sot, f"GameResult values only in SoT (not in code): {only_in_sot}"


# =============================================================================
# Tests - DB Enum vs SoT JSON
# =============================================================================

def test_db_game_token_type_matches_sot(canonical_enums: dict):
    """DB GameTokenType Enum이 SoT JSON과 일치하는지 검증."""
    try:
        from app.v2.models import GameTokenType
    except ImportError:
        pytest.skip("GameTokenType not available in app.v2.models")
    
    code_values = set(e.value for e in GameTokenType)
    sot_values = set(canonical_enums.get("GameTokenType", []))
    
    only_in_code = code_values - sot_values
    only_in_sot = sot_values - code_values
    
    # DB Enum은 일부 레거시 값이 있을 수 있으므로 warning으로 처리
    if only_in_code:
        import warnings
        warnings.warn(f"DB GameTokenType values only in code (consider updating SoT): {only_in_code}")
    
    # SoT에 있는데 DB에 없으면 에러
    assert not only_in_sot, f"GameTokenType values in SoT but not in DB: {only_in_sot}"


# =============================================================================
# Smoke Test - JSON Structure
# =============================================================================

def test_canonical_enums_json_structure(canonical_enums: dict):
    """SoT JSON 파일의 구조가 올바른지 검증."""
    required_enums = ["RewardType", "TicketType", "GameTokenType", "CostType"]
    
    for enum_name in required_enums:
        assert enum_name in canonical_enums, f"Required enum '{enum_name}' not found in SoT JSON"
        assert isinstance(canonical_enums[enum_name], list), f"'{enum_name}' should be a list"
        assert len(canonical_enums[enum_name]) > 0, f"'{enum_name}' should not be empty"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
