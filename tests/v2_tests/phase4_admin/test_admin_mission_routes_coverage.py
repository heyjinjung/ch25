
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.api.deps import get_db, get_current_admin_info
from app.db.base_class import Base
from app.v2.api.admin import mission_routes


@pytest.fixture(scope="function")
def test_app_and_db():
    fastapi_app = FastAPI()
    fastapi_app.include_router(mission_routes.router, prefix="")
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    import app.db.base  # noqa: F401
    import app.v2.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    session = SessionLocal()
    fastapi_app.dependency_overrides[get_db] = lambda: session
    fastapi_app.dependency_overrides[get_current_admin_info] = lambda: (1, "ADMIN")
    yield fastapi_app, session
    session.close()
    engine.dispose()

@pytest.fixture()
def client(test_app_and_db):
    fastapi_app, _ = test_app_and_db
    return TestClient(fastapi_app)



import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.api.deps import get_db, get_current_admin_info
from app.db.base_class import Base
from app.v2.api.admin import mission_routes

# 테스트 전용 FastAPI 인스턴스 및 라우터 등록
@pytest.fixture(scope="function")

def test_get_admin_missions_empty(client):
    response = client.get("/game/missions")
    assert response.status_code == 200
    assert response.json() == []

def test_create_admin_mission_success(client):
    payload = {
        "category": "DAILY",
        "title": "Test Mission",
        "condition": "Do something",
        "targetValue": 10,
        "logicKey": "test_logic_key",
        "rewardType": "POINT",
        "rewardAmount": 100,
        "isActive": True
    }
    response = client.post("/game/missions", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert "id" in response.json()

def test_create_admin_mission_duplicate(client):
    payload = {
        "category": "DAILY",
        "title": "Test Mission",
        "condition": "Do something",
        "targetValue": 10,
        "logicKey": "dup_logic_key",
        "rewardType": "POINT",
        "rewardAmount": 100,
        "isActive": True
    }
    client.post("/game/missions", json=payload)
    response = client.post("/game/missions", json=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "DUPLICATE_LOGIC_KEY"

def test_create_admin_mission_invalid_category(client):
    payload = {
        "category": "INVALID",
        "title": "Test Mission",
        "condition": "Do something",
        "targetValue": 10,
        "logicKey": "logic_key2",
        "rewardType": "POINT",
        "rewardAmount": 100,
        "isActive": True
    }
    response = client.post("/game/missions", json=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "INVALID_CATEGORY"

def test_create_admin_mission_invalid_reward_type(client):
    payload = {
        "category": "DAILY",
        "title": "Test Mission",
        "condition": "Do something",
        "targetValue": 10,
        "logicKey": "logic_key3",
        "rewardType": "INVALID",
        "rewardAmount": 100,
        "isActive": True
    }
    response = client.post("/game/missions", json=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "INVALID_REWARD_TYPE"

def test_update_admin_mission_success(client):
    payload = {
        "category": "DAILY",
        "title": "Test Mission",
        "condition": "Do something",
        "targetValue": 10,
        "logicKey": "logic_key4",
        "rewardType": "POINT",
        "rewardAmount": 100,
        "isActive": True
    }
    create_resp = client.post("/game/missions", json=payload)
    mission_id = create_resp.json()["id"]
    update_payload = {"title": "Updated Title", "isActive": False}
    response = client.put(f"/game/missions/{mission_id}", json=update_payload)
    assert response.status_code == 200
    assert response.json()["success"] is True

def test_delete_admin_mission_success(client):
    payload = {
        "category": "DAILY",
        "title": "Test Mission",
        "condition": "Do something",
        "targetValue": 10,
        "logicKey": "logic_key5",
        "rewardType": "POINT",
        "rewardAmount": 100,
        "isActive": True
    }
    create_resp = client.post("/game/missions", json=payload)
    mission_id = create_resp.json()["id"]
    response = client.delete(f"/game/missions/{mission_id}")
    assert response.status_code == 200
    assert response.json()["success"] is True

def test_create_admin_mission_unauthorized(client, test_app_and_db):
    fastapi_app, _ = test_app_and_db
    fastapi_app.dependency_overrides[get_current_admin_info] = lambda: (1, "VIEWER")
    payload = {
        "category": "DAILY",
        "title": "Test Mission",
        "condition": "Do something",
        "targetValue": 10,
        "logicKey": "logic_key6",
        "rewardType": "POINT",
        "rewardAmount": 100,
        "isActive": True
    }
    response = client.post("/game/missions", json=payload)
    assert response.status_code == 403
    assert response.json()["detail"] == "NOT_AUTHORIZED"
    fastapi_app.dependency_overrides[get_current_admin_info] = lambda: (1, "ADMIN")
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.models.mission import Mission, MissionRewardType
from app.v2.services.v2_admin_mission_service import V2AdminMissionService
from app.v2.services import V2AdminAuditService
from app.api.deps import get_db, get_current_admin_info
from app.db.base_class import Base

from fastapi import FastAPI
from app.v2.api.admin import mission_routes

import pytest
from fastapi.testclient import TestClient
# DB/세션/의존성 패치
@pytest.fixture(scope="function")
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

@pytest.fixture(scope="function")
def db_session(test_engine):
    SessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)


def test_get_admin_missions_empty(client):
    response = client.get("/game/missions")
    assert response.status_code == 200
    assert response.json() == []

def test_create_admin_mission_success(client):
    payload = {
        "category": "DAILY",
        "title": "Test Mission",
        "condition": "Do something",
        "targetValue": 10,
        "logicKey": "test_logic_key",
        "rewardType": "POINT",
        "rewardAmount": 100,
        "isActive": True
    }
    response = client.post("/game/missions", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert "id" in response.json()
# 테스트 전용 FastAPI 인스턴스 및 라우터 등록


def test_create_admin_mission_invalid_category(client):
    payload = {
        "category": "INVALID",
        "title": "Test Mission",
        "condition": "Do something",
        "targetValue": 10,
        "logicKey": "logic_key2",
        "rewardType": "POINT",
        "rewardAmount": 100,
        "isActive": True
    }
    response = client.post("/game/missions", json=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "INVALID_CATEGORY"

def test_create_admin_mission_invalid_reward_type(client):
    payload = {
        "category": "DAILY",
        "title": "Test Mission",
        "condition": "Do something",
        "targetValue": 10,
        "logicKey": "logic_key3",
        "rewardType": "INVALID",
        "rewardAmount": 100,
        "isActive": True
    }
    response = client.post("/game/missions", json=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "INVALID_REWARD_TYPE"

def test_delete_admin_mission_success(client):
    payload = {
        "category": "DAILY",
        "title": "Test Mission",
        "condition": "Do something",
        "targetValue": 10,
        "logicKey": "logic_key5",
        "rewardType": "POINT",
        "rewardAmount": 100,
        "isActive": True
    }
    create_resp = client.post("/game/missions", json=payload)
    mission_id = create_resp.json()["id"]
    response = client.delete(f"/game/missions/{mission_id}")
    assert response.status_code == 200
    assert response.json()["success"] is True

def test_create_admin_mission_unauthorized(client):
    # 권한 없는 경우
    client.app.dependency_overrides[get_current_admin_info] = lambda: (1, "VIEWER")
    payload = {
        "category": "DAILY",
        "title": "Test Mission",
        "condition": "Do something",
        "targetValue": 10,
        "logicKey": "logic_key6",
        "rewardType": "POINT",
        "rewardAmount": 100,
        "isActive": True
    }
    response = client.post("/game/missions", json=payload)
    assert response.status_code == 403
    assert response.json()["detail"] == "NOT_AUTHORIZED"
    client.app.dependency_overrides[get_current_admin_info] = lambda: (1, "ADMIN")
