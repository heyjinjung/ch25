from __future__ import annotations

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
from app.v2.models.user import V2User


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


def _seed_user_pair(db: Session, *, user_id: int, external_id: str, nickname: str, vault_locked: int = 0) -> None:
    if db.get(User, user_id) is None:
        db.add(
            User(
                id=user_id,
                external_id=external_id,
                nickname=nickname,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                vault_locked_balance=vault_locked,
                vault_available_balance=0,
            )
        )
    if db.get(V2User, user_id) is None:
        db.add(
            V2User(
                id=user_id,
                cc_id=external_id,
                nickname=nickname,
                vault_locked_balance=vault_locked,
            )
        )
    db.commit()


@pytest.fixture()
def client(db_session: Session) -> TestClient:
    _seed_user_pair(db_session, user_id=1, external_id="admin-1", nickname="Admin", vault_locked=0)

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


@pytest.fixture()
def client_as_admin(db_session: Session) -> TestClient:
    _seed_user_pair(db_session, user_id=1, external_id="admin-1", nickname="Admin", vault_locked=0)

    def override_get_db():
        yield db_session

    def override_get_current_admin_id():
        return 1

    def override_get_current_admin_info():
        return (1, "ADMIN")

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_admin_id] = override_get_current_admin_id
    app.dependency_overrides[get_current_admin_info] = override_get_current_admin_info

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture()
def client_as_operator(db_session: Session) -> TestClient:
    _seed_user_pair(db_session, user_id=1, external_id="admin-1", nickname="Admin", vault_locked=0)

    def override_get_db():
        yield db_session

    def override_get_current_admin_id():
        return 1

    def override_get_current_admin_info():
        return (1, "OPERATOR")

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_admin_id] = override_get_current_admin_id
    app.dependency_overrides[get_current_admin_info] = override_get_current_admin_info

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


def test_admin_user_list_and_detail_smoke(client: TestClient, db_session: Session) -> None:
    _seed_user_pair(db_session, user_id=2, external_id="user-2", nickname="User2", vault_locked=100)

    resp = client.get("/api/v2/admin/users?limit=5")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "users" in data
    assert data["total"] >= 1

    user_id = data["users"][0]["id"]
    resp = client.get(f"/api/v2/admin/users/{user_id}")
    assert resp.status_code == 200, resp.text
    detail = resp.json()
    assert detail["id"] == user_id


def test_admin_wallet_adjustment_branches(client: TestClient, db_session: Session) -> None:
    _seed_user_pair(db_session, user_id=10, external_id="user-10", nickname="WalletUser", vault_locked=500)

    # amount==0 -> 400
    resp = client.post(
        "/api/v2/admin/users/10/wallet/adjust",
        json={"amount": 0, "token_type": "VAULT", "reason": "noop"},
    )
    assert resp.status_code == 400

    # vault deposit
    resp = client.post(
        "/api/v2/admin/users/10/wallet/adjust",
        json={"amount": 100, "token_type": "VAULT", "reason": "grant"},
    )
    assert resp.status_code == 200, resp.text

    # vault withdraw ok
    resp = client.post(
        "/api/v2/admin/users/10/wallet/adjust",
        json={"amount": -50, "token_type": "VAULT", "reason": "revoke"},
    )
    assert resp.status_code == 200, resp.text

    # vault withdraw insufficient -> 400
    resp = client.post(
        "/api/v2/admin/users/10/wallet/adjust",
        json={"amount": -999999, "token_type": "VAULT", "reason": "revoke"},
    )
    assert resp.status_code == 400

    # token wallet create/grant
    resp = client.post(
        "/api/v2/admin/users/10/wallet/adjust",
        json={"amount": 3, "token_type": "ROULETTE_TICKET", "reason": "grant"},
    )
    assert resp.status_code == 200, resp.text

    # insufficient token balance
    resp = client.post(
        "/api/v2/admin/users/10/wallet/adjust",
        json={"amount": -999, "token_type": "ROULETTE_TICKET", "reason": "revoke"},
    )
    assert resp.status_code == 400

    # invalid token type
    resp = client.post(
        "/api/v2/admin/users/10/wallet/adjust",
        json={"amount": 1, "token_type": "NOT_A_TOKEN", "reason": "grant"},
    )
    assert resp.status_code == 400


def test_admin_inventory_adjust_and_notes(client: TestClient, db_session: Session) -> None:
    _seed_user_pair(db_session, user_id=20, external_id="user-20", nickname="InvUser", vault_locked=0)

    # validation: delta==0
    resp = client.post(
        "/api/v2/admin/users/20/inventory/adjust",
        json={"itemType": "CHICKEN_GIFTICON_5000", "delta": 0, "note": "x"},
    )
    assert resp.status_code == 400

    # grant
    resp = client.post(
        "/api/v2/admin/users/20/inventory/adjust",
        json={"itemType": "CHICKEN_GIFTICON_5000", "delta": 5, "note": "grant"},
    )
    assert resp.status_code == 200, resp.text

    # consume
    resp = client.post(
        "/api/v2/admin/users/20/inventory/adjust",
        json={"itemType": "CHICKEN_GIFTICON_5000", "delta": -3, "note": "consume"},
    )
    assert resp.status_code == 200, resp.text

    resp = client.get("/api/v2/admin/users/20/inventory")
    assert resp.status_code == 200, resp.text
    items = resp.json()
    assert any(i.get("itemType") == "CHICKEN_GIFTICON_5000" for i in items)

    # notes
    resp = client.post("/api/v2/admin/users/notes", json={"userId": 20, "content": "hello"})
    assert resp.status_code == 200, resp.text

    resp = client.get("/api/v2/admin/users/20/notes")
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)


def test_admin_delete_user_204_removes_legacy_and_v2(client_as_admin: TestClient, db_session: Session) -> None:
    _seed_user_pair(db_session, user_id=30, external_id="user-30", nickname="DeleteMe", vault_locked=0)

    resp = client_as_admin.delete("/api/v2/admin/users/30")
    assert resp.status_code == 204, resp.text

    assert db_session.get(User, 30) is None
    assert db_session.get(V2User, 30) is None


def test_admin_purge_user_204_removes_legacy_and_v2(client_as_admin: TestClient, db_session: Session) -> None:
    _seed_user_pair(db_session, user_id=31, external_id="user-31", nickname="PurgeMe", vault_locked=0)

    resp = client_as_admin.post("/api/v2/admin/users/31/purge")
    assert resp.status_code == 204, resp.text

    assert db_session.get(User, 31) is None
    assert db_session.get(V2User, 31) is None


def test_admin_delete_requires_admin_role(client_as_operator: TestClient, db_session: Session) -> None:
    _seed_user_pair(db_session, user_id=32, external_id="user-32", nickname="NoDelete", vault_locked=0)

    resp = client_as_operator.delete("/api/v2/admin/users/32")
    assert resp.status_code == 403
    assert resp.json().get("detail") == "ADMIN_REQUIRED"
