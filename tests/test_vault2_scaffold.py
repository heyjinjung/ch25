from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.vault2 import VaultStatus
from app.models.vault_earn_event import VaultEarnEvent
from app.services.vault2_service import Vault2Service


def test_vault2_compute_expires_at_simple():
    svc = Vault2Service()
    locked_at = datetime(2025, 12, 21, 0, 0, 0)
    assert svc.compute_expires_at(locked_at, 24) == locked_at + timedelta(hours=24)


def test_vault2_endpoints_exist_and_empty(client):
    programs = client.get("/api/vault/programs")
    assert programs.status_code == 200
    assert programs.json() == []

    top = client.get("/api/vault/top")
    assert top.status_code == 200
    assert top.json() == []


def test_vault2_apply_transitions_does_not_touch_v1_or_earn_events(session_factory) -> None:
    session: Session = session_factory()

    # v1 user balances should remain unchanged by Vault2 tick.
    user = User(id=1, external_id="tester", status="ACTIVE", cash_balance=0, vault_locked_balance=1234, vault_balance=1234)
    session.add(user)
    session.commit()

    svc = Vault2Service()
    program = svc.get_default_program(session, ensure=True)
    status = svc.get_or_create_status(session, user_id=1, program=program)
    status.state = "LOCKED"
    status.locked_amount = 500
    status.available_amount = 0
    status.locked_at = datetime.utcnow() - timedelta(hours=25)
    status.expires_at = datetime.utcnow() - timedelta(seconds=1)
    session.add(status)
    session.commit()

    assert session.query(VaultEarnEvent).count() == 0

    updated = svc.apply_transitions(session, limit=500, commit=True)
    assert int(updated) >= 1

    session.expire_all()
    user_after = session.get(User, 1)
    assert user_after is not None
    assert user_after.vault_locked_balance == 1234
    assert user_after.vault_balance == 1234
    assert user_after.cash_balance == 0

    st = session.query(VaultStatus).filter(VaultStatus.user_id == 1).one()
    assert st.state == "AVAILABLE"
    assert int(st.locked_amount or 0) == 0
    assert int(getattr(st, "available_amount", 0) or 0) == 500

    assert session.query(VaultEarnEvent).count() == 0
