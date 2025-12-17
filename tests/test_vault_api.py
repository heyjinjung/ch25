"""Vault API tests (seed + free fill once)."""

from app.models.new_member_dice import NewMemberDiceEligibility
from app.models.user import User


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

    # Second fill should fail
    res2 = client.post("/api/vault/fill")
    assert res2.status_code == 400
    assert res2.json()["error"]["code"] == "VAULT_FILL_ALREADY_USED"
