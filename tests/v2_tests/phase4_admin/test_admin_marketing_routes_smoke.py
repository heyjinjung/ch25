from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_admin_id, get_current_admin_info, get_db
from app.db.base_class import Base
from app.main import app
from app.models.user import User


@pytest.fixture()
def test_engine():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    import app.db.base  # noqa: F401
    import app.v2.models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture()
def db_session(test_engine) -> Session:
    SessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_session: Session) -> TestClient:
    def override_get_db():
        yield db_session

    def override_get_current_admin_id():
        return 1

    def override_get_current_admin_info():
        return (1, "SUPER_ADMIN")

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_admin_id] = override_get_current_admin_id
    app.dependency_overrides[get_current_admin_info] = override_get_current_admin_info

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


def _seed_users(db: Session) -> None:
    if db.query(User).filter(User.id == 1).first() is None:
        db.add(User(id=1, external_id="admin-1", nickname="Admin", created_at=datetime.utcnow(), updated_at=datetime.utcnow()))
    if db.query(User).filter(User.id == 2).first() is None:
        db.add(User(id=2, external_id="user-2", nickname="User2", created_at=datetime.utcnow(), updated_at=datetime.utcnow()))
    db.commit()


def test_v2_admin_marketing_messages_smoke(client: TestClient, db_session: Session) -> None:
    _seed_users(db_session)

    resp = client.get("/api/v2/admin/marketing/messages")
    assert resp.status_code == 200, resp.text

    # Validation branch: target USER requires target_value
    resp = client.post(
        "/api/v2/admin/marketing/messages",
        json={
            "title": "t",
            "content": "c",
            "target_type": "USER",
            "target_value": " ",
            "channels": ["INBOX"],
        },
    )
    assert resp.status_code == 400

    resp = client.post(
        "/api/v2/admin/marketing/messages",
        json={
            "title": "Hello",
            "content": "World",
            "target_type": "USER",
            "target_value": "2",
            "channels": ["INBOX"],
        },
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data.get("id")

    resp = client.get("/api/v2/admin/marketing/messages")
    assert resp.status_code == 200


def test_v2_admin_marketing_surveys_crud_smoke(client: TestClient, db_session: Session) -> None:
    _seed_users(db_session)

    payload = {
        "title": "Survey 1",
        "description": "desc",
        "channel": "GLOBAL",
        "status": "DRAFT",
        "reward_json": None,
        "questions": [
            {
                "title": "Q1",
                "question_type": "SINGLE_CHOICE",
                "order_index": 0,
                "is_required": True,
                "options": [
                    {"value": "A", "label": "A", "order_index": 0, "weight": 1},
                    {"value": "B", "label": "B", "order_index": 1, "weight": 1},
                ],
            }
        ],
    }

    resp = client.post("/api/v2/admin/marketing/surveys", json=payload)
    assert resp.status_code == 201, resp.text
    survey_id = resp.json()["id"]

    resp = client.get("/api/v2/admin/marketing/surveys")
    assert resp.status_code == 200, resp.text

    resp = client.get(f"/api/v2/admin/marketing/surveys/{survey_id}")
    assert resp.status_code == 200, resp.text

    payload_update = dict(payload)
    payload_update["title"] = "Survey 1 Updated"
    payload_update["status"] = "ACTIVE"
    resp = client.put(f"/api/v2/admin/marketing/surveys/{survey_id}", json=payload_update)
    assert resp.status_code == 200, resp.text

    resp = client.put(f"/api/v2/admin/marketing/surveys/{survey_id}/toggle", json={"is_active": False})
    assert resp.status_code == 200, resp.text

    resp = client.get(f"/api/v2/admin/marketing/surveys/{survey_id}/results")
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)

    resp = client.delete(f"/api/v2/admin/marketing/surveys/{survey_id}")
    assert resp.status_code == 200, resp.text
