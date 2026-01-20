"""
V2 Shop Admin CRUD Integration Test
- 상품 생성/수정/삭제 API 검증
- 20개 SoT 재화 기본값 검증
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_admin_info, get_db
from app.db.base_class import Base
from app.main import app


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

    def override_get_current_admin_info():
        return (1, "SUPER_ADMIN")

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_admin_info] = override_get_current_admin_info

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


def test_shop_product_sync_sot_defaults(client: TestClient):
    """SoT 20개 재화 기본값 동기화 테스트"""
    resp = client.post("/api/v2/admin/shop/products/sync")
    assert resp.status_code == 200, resp.text
    products = resp.json()
    
    # 22개 기본 상품 (20개 SoT + VAULT + NONE)
    assert len(products) >= 20
    
    # SKU 검증
    skus = {p["sku"] for p in products}
    expected_skus = {
        "SOT_ROULETTE_TICKET",
        "SOT_DICE_TICKET", 
        "SOT_LOTTERY_TICKET",
        "SOT_VAULT",
        "SOT_GOLD_KEY_TICKET",
        "SOT_DIAMOND_TICKET",
        "SOT_GOLD_KEY_FRAGMENT",
        "SOT_DIAMOND_FRAGMENT",
        "SOT_PUZZLE_C1",
        "SOT_PUZZLE_C2",
        "SOT_PUZZLE_J",
        "SOT_PUZZLE_M",
        "SOT_DIAMOND",
        "SOT_CHICKEN_GIFTICON_5000",
        "SOT_CHICKEN_GIFTICON_10000",
        "SOT_STARBUCKS_GIFTICON_2000",
        "SOT_STARBUCKS_GIFTICON_10000",
        "SOT_PIZZA_GIFTICON_5000",
        "SOT_PIZZA_GIFTICON_10000",
        "SOT_GOOGLE_GIFTICON_5000",
        "SOT_GOOGLE_GIFTICON_10000",
        "SOT_NONE",
    }
    assert expected_skus.issubset(skus)


def test_shop_product_create(client: TestClient):
    """상품 생성 API 테스트"""
    # Sync 먼저 실행
    client.post("/api/v2/admin/shop/products/sync")
    
    # 새 상품 생성
    payload = {
        "sku": "TEST_PRODUCT_001",
        "name": "테스트 상품",
        "cost_type": "VAULT",
        "cost_amount": 1500,
        "reward_type": "ROULETTE_TICKET",
        "reward_amount": 3,
        "is_visible": True,
        "sort_order": 100,
        "daily_limit": 5,
        "description": "테스트용 상품",
    }
    
    resp = client.post("/api/v2/admin/shop/products", json=payload)
    assert resp.status_code == 200, resp.text
    
    created = resp.json()
    assert created["sku"] == "TEST_PRODUCT_001"
    assert created["name"] == "테스트 상품"
    assert created["costType"] == "VAULT"
    assert created["costAmount"] == 1500
    assert created["rewardType"] == "ROULETTE_TICKET"
    assert created["rewardAmount"] == 3
    
    # 목록에서 확인
    resp = client.get("/api/v2/admin/shop/products")
    assert resp.status_code == 200
    products = resp.json()
    assert any(p["sku"] == "TEST_PRODUCT_001" for p in products)


def test_shop_product_create_duplicate_sku(client: TestClient):
    """중복 SKU로 상품 생성 시 400 에러"""
    client.post("/api/v2/admin/shop/products/sync")
    
    payload = {
        "sku": "SOT_ROULETTE_TICKET",  # 이미 존재하는 SKU
        "name": "중복 상품",
        "cost_type": "VAULT",
        "cost_amount": 100,
        "reward_type": "DICE_TICKET",
        "reward_amount": 1,
    }
    
    resp = client.post("/api/v2/admin/shop/products", json=payload)
    assert resp.status_code == 400
    assert "DUPLICATE_SKU" in resp.text


def test_shop_product_update(client: TestClient):
    """상품 전체 수정 API 테스트"""
    # Sync 후 상품 ID 가져오기
    resp = client.post("/api/v2/admin/shop/products/sync")
    products = resp.json()
    
    roulette_product = next((p for p in products if p["sku"] == "SOT_ROULETTE_TICKET"), None)
    assert roulette_product is not None
    
    product_id = roulette_product["id"]
    
    # 수정
    payload = {
        "name": "룰렛 티켓 (Updated)",
        "cost_amount": 150,
        "reward_amount": 2,
        "is_visible": False,
    }
    
    resp = client.put(f"/api/v2/admin/shop/products/{product_id}", json=payload)
    assert resp.status_code == 200, resp.text
    
    # 확인
    resp = client.get("/api/v2/admin/shop/products")
    products = resp.json()
    updated = next((p for p in products if p["id"] == product_id), None)
    
    assert updated["name"] == "룰렛 티켓 (Updated)"
    assert updated["costAmount"] == 150
    assert updated["rewardAmount"] == 2
    assert updated["isVisible"] is False


def test_shop_product_delete(client: TestClient):
    """상품 삭제 API 테스트"""
    # 새 상품 생성
    payload = {
        "sku": "DELETE_TEST",
        "name": "삭제할 상품",
        "cost_type": "VAULT",
        "cost_amount": 100,
        "reward_type": "DICE_TICKET",
        "reward_amount": 1,
    }
    
    resp = client.post("/api/v2/admin/shop/products", json=payload)
    created = resp.json()
    product_id = created["id"]
    
    # 삭제
    resp = client.delete(f"/api/v2/admin/shop/products/{product_id}")
    assert resp.status_code == 200, resp.text
    
    # 목록에서 확인
    resp = client.get("/api/v2/admin/shop/products")
    products = resp.json()
    assert not any(p["id"] == product_id for p in products)


def test_shop_product_delete_not_found(client: TestClient):
    """존재하지 않는 상품 삭제 시 404"""
    resp = client.delete("/api/v2/admin/shop/products/999999")
    assert resp.status_code == 404


def test_shop_exchange_rates_validation(client: TestClient):
    """교환 비율 검증 (게임 티켓 100P, 프리미엄 1000P)"""
    resp = client.post("/api/v2/admin/shop/products/sync")
    products = resp.json()
    
    # 게임 티켓 = 100P
    game_tickets = ["SOT_ROULETTE_TICKET", "SOT_DICE_TICKET", "SOT_LOTTERY_TICKET"]
    for sku in game_tickets:
        product = next((p for p in products if p["sku"] == sku), None)
        assert product is not None
        assert product["costAmount"] == 100, f"{sku} should cost 100P"
    
    # 프리미엄 티켓 = 1000P
    premium_tickets = ["SOT_GOLD_KEY_TICKET", "SOT_DIAMOND_TICKET"]
    for sku in premium_tickets:
        product = next((p for p in products if p["sku"] == sku), None)
        assert product is not None
        assert product["costAmount"] == 1000, f"{sku} should cost 1000P"
    
    # 다이아몬드 = 2000P
    diamond = next((p for p in products if p["sku"] == "SOT_DIAMOND"), None)
    assert diamond is not None
    assert diamond["costAmount"] == 2000
    
    # 기프티콘 실제 가치
    gifticon_5000 = next((p for p in products if p["sku"] == "SOT_CHICKEN_GIFTICON_5000"), None)
    assert gifticon_5000 is not None
    assert gifticon_5000["costAmount"] == 5000
