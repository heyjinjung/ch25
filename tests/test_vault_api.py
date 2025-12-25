"""Vault API tests (seed + free fill once)."""

from app.core.config import get_settings
from app.models.new_member_dice import NewMemberDiceEligibility
from app.models.user import User
from app.models.vault_earn_event import VaultEarnEvent


def test_vault_status_does_not_seed_on_fetch(client, session_factory):
    db = session_factory()

    user = User(external_id="u-vault")
    db.add(user)
    db.commit()
    db.refresh(user)

    db.add(NewMemberDiceEligibility(user_id=user.id, is_eligible=True))
    db.commit()

    res = client.get("/api/vault/status")
    assert res.status_code == 200
    data = res.json()
    assert data["eligible"] is True
    assert data["vault_balance"] == 0
    assert data["cash_balance"] == 0
    assert data["seeded"] is False


def test_vault_fill_only_once(client, session_factory):
    db = session_factory()

    user = User(external_id="u-fill")
    db.add(user)
    db.commit()
    db.refresh(user)

    db.add(NewMemberDiceEligibility(user_id=user.id, is_eligible=True))
    db.commit()

    # First fill should seed + add 5,000 => 15,000
    res1 = client.post("/api/vault/fill")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["eligible"] is True
    assert data1["delta"] == 5000
    assert data1["vault_balance_after"] == 15000

    db.expire_all()
    user_after = db.get(User, user.id)
    assert user_after is not None
    assert user_after.vault_locked_balance == 15000
    assert user_after.vault_balance == 15000
    assert db.query(VaultEarnEvent).count() == 0

    # Second fill should fail
    res2 = client.post("/api/vault/fill")
    assert res2.status_code == 400
    assert res2.json()["error"]["code"] == "VAULT_FILL_ALREADY_USED"


def test_vault_fill_applies_multiplier_when_enabled(client, session_factory, monkeypatch):
    monkeypatch.setenv("VAULT_ACCRUAL_MULTIPLIER_ENABLED", "true")
    monkeypatch.setenv("VAULT_ACCRUAL_MULTIPLIER_VALUE", "2.0")
    monkeypatch.setenv("VAULT_ACCRUAL_MULTIPLIER_START_KST", "2025-12-25")
    monkeypatch.setenv("VAULT_ACCRUAL_MULTIPLIER_END_KST", "2025-12-27")
    get_settings.cache_clear()

    db = session_factory()

    user = User(external_id="u-fill-mult")
    db.add(user)
    db.commit()
    db.refresh(user)

    db.add(NewMemberDiceEligibility(user_id=user.id, is_eligible=True))
    db.commit()

    res = client.post("/api/vault/fill")
    assert res.status_code == 200
    data = res.json()
    assert data["eligible"] is True
    # 5,000 * 2.0
    assert data["delta"] == 10000
    # seed 10,000 + fill 10,000
    assert data["vault_balance_after"] == 20000


def test_vault_status_unlock_rules_json_includes_grand_cycle_fields(client, session_factory):
    db = session_factory()

    user = User(external_id="u-rules")
    db.add(user)
    db.commit()
    db.refresh(user)

    db.add(NewMemberDiceEligibility(user_id=user.id, is_eligible=True))
    db.commit()

    res = client.get("/api/vault/status")
    assert res.status_code == 200
    data = res.json()

    rules = data.get("unlock_rules_json")
    assert isinstance(rules, dict)
    assert rules.get("version") == 2

    gc = rules.get("grand_cycle_unlock")
    assert isinstance(gc, dict)
    assert gc.get("gold_unlock_tiers") == [30, 50, 70]
    assert gc.get("diamond_unlock", {}).get("min_diamond_keys") == 2
    assert gc.get("diamond_unlock", {}).get("min_gold_cumulative") == 1000000
    assert gc.get("seed_carryover", {}).get("min_percent") == 10
    assert gc.get("seed_carryover", {}).get("max_percent") == 30
