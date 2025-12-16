"""New-member dice judgement integration tests."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.new_member_dice import NewMemberDiceEligibility
from app.models.user import User


def _seed_user(session: Session) -> None:
    if session.get(User, 1) is None:
        session.add(User(id=1, external_id="tester", status="ACTIVE"))
        session.commit()


def test_new_member_dice_status_ineligible_by_default(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    _seed_user(session)
    session.close()

    resp = client.get("/api/new-member-dice/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["eligible"] is False
    assert data["already_played"] is False


def test_new_member_dice_play_requires_eligibility(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    _seed_user(session)
    session.close()

    resp = client.post("/api/new-member-dice/play")
    assert resp.status_code == 403
    body = resp.json()
    assert body["error"]["code"] == "NEW_MEMBER_DICE_NOT_ELIGIBLE"


def test_new_member_dice_play_once_then_block(client: TestClient, session_factory, monkeypatch) -> None:
    import random

    session: Session = session_factory()
    _seed_user(session)
    session.add(NewMemberDiceEligibility(user_id=1, is_eligible=True, campaign_key="test"))
    session.commit()
    session.close()

    monkeypatch.setattr(random, "random", lambda: 0.99)  # force LOSE
    monkeypatch.setattr(random, "randint", lambda a, b: a)  # deterministic within bounds

    first = client.post("/api/new-member-dice/play")
    assert first.status_code == 200
    data = first.json()
    assert data["result"] == "OK"
    assert data["game"]["outcome"] in ("WIN", "LOSE")

    second = client.post("/api/new-member-dice/play")
    assert second.status_code == 400
    body = second.json()
    assert body["error"]["code"] == "NEW_MEMBER_DICE_ALREADY_PLAYED"
