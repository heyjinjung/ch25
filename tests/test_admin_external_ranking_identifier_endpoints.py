import pytest

from fastapi.testclient import TestClient

from app.models.user import User
from app.schemas.external_ranking import ExternalRankingCreate
from app.services.admin_external_ranking_service import AdminExternalRankingService


@pytest.fixture
def db_session(session_factory):
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def test_admin_external_ranking_put_by_identifier_telegram_and_delete(client: TestClient, db_session):
    user = User(external_id="ext-put-del-1", nickname="NickPutDel", telegram_username="TelePutDel")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Seed an external ranking row for this user.
    AdminExternalRankingService.upsert_many(
        db_session,
        [ExternalRankingCreate(user_id=user.id, deposit_amount=100, play_count=1, memo="seed")],
    )

    res = client.put(
        f"/admin/api/external-ranking/by-identifier/@teleputdel",
        json={"deposit_amount": 777, "memo": "updated"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["user_id"] == user.id
    assert body["deposit_amount"] == 777
    assert body["memo"] == "updated"

    res = client.delete(f"/admin/api/external-ranking/by-identifier/TelePutDel")
    assert res.status_code == 204


def test_admin_external_ranking_put_by_identifier_nickname(client: TestClient, db_session):
    user = User(external_id="ext-put-nick-1", nickname="MyNickName", telegram_username=None)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    AdminExternalRankingService.upsert_many(
        db_session,
        [ExternalRankingCreate(user_id=user.id, deposit_amount=10, play_count=0, memo="seed")],
    )

    res = client.put(
        f"/admin/api/external-ranking/by-identifier/mynickname",
        json={"deposit_amount": 42},
    )
    assert res.status_code == 200
    assert res.json()["user_id"] == user.id
    assert res.json()["deposit_amount"] == 42


def test_admin_external_ranking_delete_by_identifier_ambiguous_nickname_409(client: TestClient, db_session):
    u1 = User(external_id="ext-amb-1", nickname="DupNick")
    u2 = User(external_id="ext-amb-2", nickname="DupNick")
    db_session.add_all([u1, u2])
    db_session.commit()

    res = client.delete("/admin/api/external-ranking/by-identifier/DupNick")
    assert res.status_code == 409
