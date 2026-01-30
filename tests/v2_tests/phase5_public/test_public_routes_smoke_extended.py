import uuid
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user_id as get_v1_user_id, get_db
from app.v2.api.deps import get_current_user_id as get_v2_user_id
from app.db.base_class import Base
from app.main import app
from app.models.user import User
from app.v2.services.user_service import V2UserService


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
def seed_session(test_engine) -> Session:
    SessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(test_engine) -> TestClient:
    SessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)

    def _override_get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.pop(get_db, None)


def _seed_user(db: Session) -> User:
    cc_id = f"test-{uuid.uuid4().hex}"
    user = User(
        external_id=cc_id,
        nickname="V2 Public Smoke",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        vault_locked_balance=10000,
    )
    db.add(user)
    db.flush()
    
    # [V2 Native] Ensure user exists in v2_user table
    V2UserService.get_or_create_v2_user_from_legacy(db, cc_id)
    db.commit()
    return user


def _override_auth(user_id: int) -> None:
    # Both V1 and V2 dependencies must be overridden
    app.dependency_overrides[get_v1_user_id] = lambda: user_id
    app.dependency_overrides[get_v2_user_id] = lambda: user_id


def _clear_auth_override() -> None:
    app.dependency_overrides.pop(get_v1_user_id, None)
    app.dependency_overrides.pop(get_v2_user_id, None)


def test_v2_public_routes_smoke_extended(client: TestClient, seed_session: Session) -> None:
    from app.v2.models.v2_admin_message import V2AdminMessage, V2AdminMessageInbox

    user = _seed_user(seed_session)

    # Seed an unread inbox message to exercise inbox + ticket-zero pending reward checks.
    msg = V2AdminMessage(
        sender_admin_id=1,
        title="Hello",
        content="World",
        target_type="USER",
        target_value=str(user.id),
        channels=["INBOX"],
        recipient_count=1,
        read_count=0,
        is_deleted=False,
        created_at=datetime.utcnow(),
    )
    seed_session.add(msg)
    seed_session.flush()

    inbox = V2AdminMessageInbox(
        user_id=user.id,
        message_id=msg.id,
        is_read=False,
        created_at=datetime.utcnow(),
    )
    seed_session.add(inbox)
    seed_session.commit()

    _override_auth(user.id)
    try:
        # Core sanity
        resp = client.get("/api/v2/health")
        assert resp.status_code in (200, 404)

        # Mission (safe GETs)
        resp = client.get("/api/v2/mission/")
        assert resp.status_code in (200, 404), resp.text

        resp = client.get("/api/v2/mission/streak/rules")
        assert resp.status_code == 200, resp.text

        # Claim requires idempotency header; exercise validation branch.
        resp = client.post("/api/v2/mission/1/claim")
        assert resp.status_code == 400

        # Inventory
        resp = client.get("/api/v2/inventory")
        assert resp.status_code == 200, resp.text

        resp = client.get("/api/v2/inventory/items")
        assert resp.status_code == 200, resp.text

        # Inventory use requires item_type + idempotency key; exercise both validations.
        resp = client.post("/api/v2/inventory/use", json={"item_type": "", "amount": 1})
        assert resp.status_code == 400

        resp = client.post("/api/v2/inventory/use", json={"item_type": "DIAMOND", "amount": 1})
        assert resp.status_code == 400

        # Shop products should be safe even with no UI config.
        resp = client.get("/api/v2/shop/products")
        assert resp.status_code == 200, resp.text

        # Purchase validations - benefits_suspended user gets 403 for all purchases
        resp = client.post("/api/v2/shop/purchase", json={"sku": ""})
        assert resp.status_code == 403  # benefits_suspended policy blocks first

        # benefits_suspended user -> 403 Forbidden (purchase blocked)
        resp = client.post("/api/v2/shop/purchase", json={"sku": "sku-1"})
        assert resp.status_code == 403  # benefits_suspended policy

        # Ticket-zero
        resp = client.get("/api/v2/ticket-zero/status")
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert isinstance(data.get("bailout_available"), bool)

        # Inbox
        resp = client.get("/api/v2/inbox")
        assert resp.status_code == 200, resp.text
        inbox_list = resp.json()
        assert "messages" in inbox_list

        resp = client.patch("/api/v2/inbox/read", json={"inbox_ids": [inbox.id]})
        assert resp.status_code == 200, resp.text

        # Survey compat endpoints (should be safe with empty state)
        resp = client.get("/api/v2/surveys/active")
        assert resp.status_code == 200, resp.text

        # Golden intervention endpoints (exercise both success and validation branches)
        resp = client.post("/api/v2/golden/intervention/resolve", json={"event_type": "", "data": {}})
        assert resp.status_code == 400

        resp = client.post("/api/v2/golden/intervention/resolve", json={"event_type": "LOSS_STREAK", "data": {}})
        assert resp.status_code == 200, resp.text

        resp = client.post("/api/v2/golden/reengagement/queue", json={"reason": "test", "channel": "INBOX"})
        assert resp.status_code == 200, resp.text

        # Team battle (safe GET)
        resp = client.get("/api/v2/team-battle/seasons/active")
        assert resp.status_code == 200, resp.text

        resp = client.get("/api/v2/team-battle/teams")
        assert resp.status_code == 200, resp.text

    finally:
        _clear_auth_override()
