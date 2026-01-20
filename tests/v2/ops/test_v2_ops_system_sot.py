import pytest
from pydantic import ValidationError
from app.v2.schemas.v2_ui_config import UiConfigUpsertRequest
from app.v2.schemas.v2_admin_game_config import AdminRouletteConfigV2

# Validates:
# - docs/v2_specs/05_ops/v2_system_ops_sot_ko.md (System Inteigry checks)
# - docs/v2_specs/05_ops/v2_shop_products_ui_config_sot_ko.md (UI Config Structure)

def test_ui_config_upsert_schema():
    """Verify generic UI config schema accepts dictionary values."""
    data = {"value": {"banners": [{"id": 1}], "maintenance_mode": True}}
    req = UiConfigUpsertRequest(**data)
    assert req.value["maintenance_mode"] is True
    assert isinstance(req.value["banners"], list)

def test_roulette_config_integrity_checks():
    """Verify Roulette Config integrity (Slot Index, Weights) as per System Ops."""
    valid_segment_base = {"weight": 10, "reward_type": "POINT", "reward_amount": 100}
    
    # Valid Case
    segments = [
        {**valid_segment_base, "slot_index": i, "label": f"S{i}"}
        for i in range(6)
    ]
    valid_data = {
        "name": "Standard Roulette",
        "max_daily_spins": 10,
        "segments": segments
    }
    cfg = AdminRouletteConfigV2(**valid_data)
    assert len(cfg.segments) == 6

    # Integrity Check 1: Invalid Slot Index (>5)
    invalid_segments = [s.copy() for s in segments]
    invalid_segments[0]["slot_index"] = 6 # Out of bound
    invalid_data = {**valid_data, "segments": invalid_segments}
    with pytest.raises(ValidationError) as exc:
        AdminRouletteConfigV2(**invalid_data)
    assert "slot_index must be between 0 and 5" in str(exc.value)

    # Integrity Check 2: Negative Weight
    invalid_segments_w = [s.copy() for s in segments]
    invalid_segments_w[0]["weight"] = -1
    invalid_data_w = {**valid_data, "segments": invalid_segments_w}
    with pytest.raises(ValidationError) as exc:
        AdminRouletteConfigV2(**invalid_data_w)
    assert "weight must be >= 0" in str(exc.value)
