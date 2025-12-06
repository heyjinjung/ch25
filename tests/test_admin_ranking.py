"""Integration tests for admin ranking upload and retrieval."""
from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.ranking import RankingDaily


def seed_user(session: Session) -> None:
    session.add(User(id=1, external_id="admin-tester", status="ACTIVE"))
    session.commit()


def test_admin_ranking_replace_and_fetch(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    seed_user(session)
    session.close()

    today = date.today().isoformat()
    payload = [
        {"date": today, "rank": 1, "display_name": "Alice", "score": 100, "user_id": 1},
        {"date": today, "rank": 2, "display_name": "Bob", "score": 80, "user_id": None},
    ]

    put_resp = client.put(f"/admin/api/ranking/{today}", json=payload)
    assert put_resp.status_code == 200
    data = put_resp.json()
    assert data["date"] == today
    assert len(data["items"]) == 2

    get_resp = client.get(f"/admin/api/ranking/{today}")
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    ranks = [item["rank"] for item in get_data["items"]]
    assert ranks == [1, 2]

    verify: Session = session_factory()
    assert verify.query(RankingDaily).count() == 2
    verify.close()


def test_admin_ranking_conflict_on_duplicate_ranks(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    seed_user(session)
    session.close()

    today = date.today().isoformat()
    duplicate_payload = [
        {"date": today, "rank": 1, "display_name": "Alice", "score": 50, "user_id": 1},
        {"date": today, "rank": 1, "display_name": "Bob", "score": 40, "user_id": None},
    ]

    resp = client.put(f"/admin/api/ranking/{today}", json=duplicate_payload)
    assert resp.status_code == 409
    body = resp.json()
    assert body["error"]["code"] == "RANKING_CONFLICT"
