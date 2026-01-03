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


def test_admin_segments_list_by_identifier(client: TestClient, db_session):
    user = User(external_id="ext-seg-1", nickname="NickSEG", telegram_username="SegTele")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    res = client.get("/admin/api/segments/", params={"identifier": "@segtele", "limit": 50})
    assert res.status_code == 200
    body = res.json()
    assert isinstance(body, list)
    assert len(body) == 1
    assert body[0]["user_id"] == user.id


def test_admin_segments_list_identifier_not_found_returns_404(client: TestClient, db_session):
    res = client.get("/admin/api/segments/", params={"identifier": "no-such-user"})
    assert res.status_code == 404


def test_admin_segments_list_identifier_ambiguous_returns_409(client: TestClient, db_session):
    u1 = User(external_id="ext-seg-a1", nickname="DupSeg")
    u2 = User(external_id="ext-seg-a2", nickname="DupSeg")
    db_session.add_all([u1, u2])
    db_session.commit()

    res = client.get("/admin/api/segments/", params={"identifier": "DupSeg"})
    assert res.status_code == 409
