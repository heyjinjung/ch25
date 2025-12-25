from __future__ import annotations

from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.new_member_dice import NewMemberDiceEligibility
from app.models.user import User


def _set_ticket_balances(db, *, dice: int, roulette: int, lottery: int) -> None:
    mapping = {
        GameTokenType.DICE_TOKEN: dice,
        GameTokenType.ROULETTE_COIN: roulette,
        GameTokenType.LOTTERY_TICKET: lottery,
    }
    for token_type, balance in mapping.items():
        row = (
            db.query(UserGameWallet)
            .filter(UserGameWallet.user_id == 1, UserGameWallet.token_type == token_type)
            .one_or_none()
        )
        if row is None:
            row = UserGameWallet(user_id=1, token_type=token_type, balance=0)
        row.balance = balance
        db.add(row)
    db.commit()


def _ensure_eligible(db) -> None:
    row = db.query(NewMemberDiceEligibility).filter(NewMemberDiceEligibility.user_id == 1).one_or_none()
    if row is None:
        row = NewMemberDiceEligibility(user_id=1, is_eligible=True)
    row.is_eligible = True
    row.revoked_at = None
    row.expires_at = datetime.utcnow() + timedelta(days=1)
    db.add(row)
    db.commit()


def _set_locked(db, *, locked_balance: int, expires_at: datetime | None) -> None:
    user = db.query(User).filter(User.id == 1).one_or_none()
    if user is None:
        user = User(id=1, external_id="test-user-1")
    user.vault_locked_balance = locked_balance
    user.vault_locked_expires_at = expires_at
    # keep legacy mirror consistent (route also re-syncs, but make tests explicit)
    user.vault_balance = locked_balance
    db.add(user)
    db.commit()


def test_recommended_action_open_vault_modal_when_ticket0_and_unexpired_locked(client: TestClient, session_factory):
    db = session_factory()
    _ensure_eligible(db)
    _set_ticket_balances(db, dice=0, roulette=0, lottery=0)
    _set_locked(db, locked_balance=12_500, expires_at=datetime.utcnow() + timedelta(hours=1))

    res = client.get("/api/vault/status")
    assert res.status_code == 200
    body = res.json()
    assert body.get("recommended_action") == "OPEN_VAULT_MODAL"
    assert body.get("cta_payload") == {"reason": "TICKET_ZERO"}


def test_recommended_action_none_when_has_ticket(client: TestClient, session_factory):
    db = session_factory()
    _ensure_eligible(db)
    _set_ticket_balances(db, dice=1, roulette=0, lottery=0)
    _set_locked(db, locked_balance=12_500, expires_at=datetime.utcnow() + timedelta(hours=1))

    res = client.get("/api/vault/status")
    assert res.status_code == 200
    body = res.json()
    assert body.get("recommended_action") is None
    assert body.get("cta_payload") is None


def test_recommended_action_none_when_locked_zero(client: TestClient, session_factory):
    db = session_factory()
    _ensure_eligible(db)
    _set_ticket_balances(db, dice=0, roulette=0, lottery=0)
    _set_locked(db, locked_balance=0, expires_at=None)

    res = client.get("/api/vault/status")
    assert res.status_code == 200
    body = res.json()
    assert body.get("recommended_action") is None
    assert body.get("cta_payload") is None


def test_recommended_action_none_when_locked_expired(client: TestClient, session_factory):
    db = session_factory()
    _ensure_eligible(db)
    _set_ticket_balances(db, dice=0, roulette=0, lottery=0)
    _set_locked(db, locked_balance=12_500, expires_at=datetime.utcnow() - timedelta(seconds=1))

    res = client.get("/api/vault/status")
    assert res.status_code == 200
    body = res.json()
    assert body.get("recommended_action") is None
    assert body.get("cta_payload") is None
