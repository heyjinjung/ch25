"""Test: Vault2Service pure helpers

목표: app/v2/services/vault2_service.py의 순수 헬퍼 로직 커버리지(ROI) 확보
- deep merge / config build
- expiry enablement / expires_at 계산
- unlock_rules_json 파싱 / progress_json 이벤트 append
"""

from __future__ import annotations

from datetime import datetime

from app.v2.models import VaultProgram, VaultStatus
from app.v2.services.vault2_service import Vault2Service


def test_vault2_deep_merge_and_effective_config_preserves_defaults():
    merged = Vault2Service._deep_merge_dict(
        {"a": 1, "nested": {"x": 1, "y": 2}},
        {"nested": {"x": 99}, "b": 2},
    )
    assert merged["a"] == 1
    assert merged["b"] == 2
    assert merged["nested"]["x"] == 99
    assert merged["nested"]["y"] == 2

    effective = Vault2Service._build_effective_config({"enable_game_earn_events": False, "caps": {"DICE": {"daily_gain": 777}}})
    assert effective["enable_game_earn_events"] is False
    assert effective["caps"]["DICE"]["daily_gain"] == 777
    # defaults should remain when override is partial
    assert "probability" in effective and "DICE" in effective["probability"]


def test_vault2_expiry_helpers_and_grace_hours():
    svc = Vault2Service()
    locked_at = datetime(2026, 2, 12, 0, 0, 0)

    assert svc.compute_expires_at(locked_at, 0) is None
    assert svc.compute_expires_at(locked_at, -1) is None
    assert svc.compute_expires_at(locked_at, 24) == datetime(2026, 2, 13, 0, 0, 0)

    program_off = VaultProgram(expire_policy="OFF", duration_hours=24)
    assert Vault2Service._is_expiry_enabled(program_off) is False

    program_on = VaultProgram(expire_policy="FIXED_24H", duration_hours=24)
    assert Vault2Service._is_expiry_enabled(program_on) is True

    program_rules = VaultProgram(unlock_rules_json={"available_grace_hours": "12"})
    assert Vault2Service._get_available_grace_hours(program_rules) == 12

    program_bad = VaultProgram(unlock_rules_json={"available_grace_hours": "nope"})
    assert Vault2Service._get_available_grace_hours(program_bad) == 0


def test_vault2_append_event_initializes_progress_json():
    status = VaultStatus(progress_json=None)
    Vault2Service._append_event(status, {"type": "EARN", "amount": 10})
    assert isinstance(status.progress_json, dict)
    assert isinstance(status.progress_json.get("events"), list)
    assert status.progress_json["events"][0]["type"] == "EARN"
