import pytest

from fastapi.testclient import TestClient

from app.models.user import User


@pytest.fixture
def db_session(session_factory):
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def test_admin_users_resolve_numeric_prefers_user_id_over_tg_id(client: TestClient, db_session):
    u1 = User(external_id="ext-res-1", nickname="Nick1")
    db_session.add(u1)
    db_session.commit()
    db_session.refresh(u1)

    # Another user whose telegram_id equals u1.id (collision scenario)
    u2 = User(external_id="ext-res-2", nickname="Nick2", telegram_id=int(u1.id))
    db_session.add(u2)
    db_session.commit()

    res = client.get(f"/admin/api/users/resolve?identifier={u1.id}")
    assert res.status_code == 200
    assert res.json()["user"]["id"] == u1.id


def test_admin_users_resolve_username_case_insensitive(client: TestClient, db_session):
    user = User(external_id="ext-res-u", nickname="NickU", telegram_username="Zzzzzpty")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    res = client.get("/admin/api/users/resolve", params={"identifier": "@zzzzzpty"})
    assert res.status_code == 200
    assert res.json()["user"]["id"] == user.id


def test_admin_users_resolve_tg_external_id_pattern(client: TestClient, db_session):
    user = User(external_id="tg_8338823321_deadbeef", nickname="NickT", telegram_id=8338823321)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    res = client.get("/admin/api/users/resolve", params={"identifier": "tg_8338823321_deadbeef"})
    assert res.status_code == 200
    body = res.json()["user"]
    assert body["id"] == user.id
    assert body["tg_id"] == 8338823321


def test_admin_users_resolve_ambiguous_nickname_returns_409(client: TestClient, db_session):
    u1 = User(external_id="ext-res-a1", nickname="DupNick")
    u2 = User(external_id="ext-res-a2", nickname="DupNick")
    db_session.add_all([u1, u2])
    db_session.commit()

    res = client.get("/admin/api/users/resolve", params={"identifier": "DupNick"})
    assert res.status_code == 409


def test_admin_game_tokens_grant_accepts_telegram_username_in_external_id_field(client: TestClient, db_session):
    user = User(external_id="ext-gt-1", nickname="NickGT", telegram_username="TeleGT")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    res = client.post(
        "/admin/api/game-tokens/grant",
        json={"external_id": "@telegt", "token_type": "DICE_TOKEN", "amount": 1},
    )
    assert res.status_code == 200
    assert res.json()["user_id"] == user.id


def test_admin_inventory_by_identifier_get_and_adjust(client: TestClient, db_session):
    user = User(external_id="ext-inv-1", nickname="NickINV", telegram_username="TeleInv")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    res = client.get(f"/admin/api/inventory/users/by-identifier/@teleinv")
    assert res.status_code == 200
    assert res.json()["user"]["id"] == user.id

    res = client.post(
        f"/admin/api/inventory/users/by-identifier/TeleInv/adjust",
        json={"item_type": "DIAMOND", "delta": 1, "note": "test"},
    )
    assert res.status_code == 200
    assert res.json()["user_id"] == user.id
