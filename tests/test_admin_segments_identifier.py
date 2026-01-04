import pytest

from fastapi.testclient import TestClient

from app.models.external_ranking import ExternalRankingData
from app.models.segment_rule import SegmentRule
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


def test_admin_segments_includes_recommendation_from_rules(client: TestClient, db_session):
    user = User(external_id="ext-seg-rec-1", nickname="RecNick", telegram_username="RecTele")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    db_session.add(ExternalRankingData(user_id=user.id, deposit_amount=2000))
    db_session.add(
        SegmentRule(
            name="VIP_RULE_TEST",
            segment="VIP",
            priority=1,
            enabled=True,
            condition_json={"field": "deposit_amount", "op": ">=", "value": 1000},
        )
    )
    db_session.commit()

    res = client.get("/admin/api/segments/", params={"identifier": "@rectele", "limit": 50})
    assert res.status_code == 200
    body = res.json()
    assert isinstance(body, list)
    assert len(body) == 1
    assert body[0]["user_id"] == user.id
    assert body[0]["recommended_segment"] == "VIP"
    assert body[0]["recommended_rule_name"] == "VIP_RULE_TEST"
    assert body[0]["recommended_reason"] == "입금 2,000 / 최근활동 정보없음"
