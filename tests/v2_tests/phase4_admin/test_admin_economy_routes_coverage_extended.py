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
from app.models.app_ui_config import AppUiConfig
from app.models.user import User
from app.models.vault_withdrawal_request import VaultWithdrawalRequest


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


def _seed_admin_and_user(db: Session) -> None:
    if db.get(User, 1) is None:
        db.add(User(id=1, external_id="admin-1", nickname="Admin", created_at=datetime.utcnow(), updated_at=datetime.utcnow()))
    if db.get(User, 2) is None:
        db.add(User(id=2, external_id="user-2", nickname="User2", created_at=datetime.utcnow(), updated_at=datetime.utcnow()))
    if db.query(AppUiConfig).filter(AppUiConfig.key == "v2_shop_products").first() is None:
        db.add(
            AppUiConfig(
                key="v2_shop_products",
                value_json={
                    "products": [
                        {
                            "sku": "TEST_SKU_1",
                            "name": "Test Product",
                            "cost_type": "VAULT",
                            "cost_amount": 10,
                            "reward_type": "ROULETTE_TICKET",
                            "reward_amount": 1,
                            "is_visible": True,
                        }
                    ]
                },
            )
        )
    db.commit()


@pytest.fixture()
def client(db_session: Session) -> TestClient:
    _seed_admin_and_user(db_session)

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


def test_admin_economy_transaction_types(client: TestClient) -> None:
    resp = client.get("/api/v2/admin/economy/transaction-types")
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)


def test_admin_deposit_log_crud(client: TestClient) -> None:
    # Create
    resp = client.post(
        "/api/v2/admin/economy/deposits",
        json={"user_id": 2, "amount": 123, "kst_date": "2026-01-20"},
    )
    assert resp.status_code == 200, resp.text
    created = resp.json()
    log_id = created["id"]

    # List
    resp = client.get("/api/v2/admin/economy/deposits?limit=10")
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)

    # Update
    resp = client.put(
        f"/api/v2/admin/economy/deposits/{log_id}",
        json={"amount": 200, "kst_date": "2026-01-20"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["amount"] == 200

    # Delete
    resp = client.delete(f"/api/v2/admin/economy/deposits/{log_id}")
    assert resp.status_code == 200, resp.text
    assert resp.json().get("success") is True


def test_admin_withdrawals_list(client: TestClient, db_session: Session) -> None:
    # Seed a pending withdrawal
    if db_session.query(VaultWithdrawalRequest).count() == 0:
        db_session.add(VaultWithdrawalRequest(user_id=2, amount=5000, status="PENDING"))
        db_session.commit()

    resp = client.get("/api/v2/admin/withdrawals?status=PENDING")
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)


def test_admin_shop_products_sync_and_updates(client: TestClient) -> None:
    resp = client.get("/api/v2/admin/shop/products")
    assert resp.status_code == 200, resp.text
    products = resp.json()
    assert isinstance(products, list)

    resp = client.post("/api/v2/admin/shop/products/sync")
    assert resp.status_code == 200, resp.text
    products = resp.json()
    assert len(products) >= 1

    product_id = products[0]["id"]

    resp = client.put(
        f"/api/v2/admin/shop/products/{product_id}/status",
        json={"isVisible": False},
    )
    assert resp.status_code == 200, resp.text

    resp = client.put(
        f"/api/v2/admin/shop/products/{product_id}/price",
        json={"price": 123},
    )
    assert resp.status_code == 200, resp.text

    resp = client.put(
        f"/api/v2/admin/shop/products/{product_id}/price",
        json={"price": -1},
    )
    assert resp.status_code == 400
