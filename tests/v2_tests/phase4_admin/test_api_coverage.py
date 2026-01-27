import pytest
from fastapi.testclient import TestClient
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.base_class import Base
import app.db.base  # noqa: F401
import app.v2.models  # noqa: F401
from app.main import app
from app.api.deps import get_current_admin_id, get_current_admin_info, get_db

# Import all V2 schemas to ensure 100% file-level coverage
from app.v2.schemas.v2_level_xp import LevelRewardLog, LevelXPStatusResponse
from app.v2.schemas.v2_mission import (
    MissionSchema, MissionProgressSchema, MissionWithProgress, 
    StreakInfoSchema, MissionListResponse, MissionCreate, MissionUpdate
)
from app.v2.schemas.v2_level_reward import V2LevelRewardRow, V2LevelRewardTableResponse
from app.v2.schemas.v2_shop_exchange import (
    V2ShopOrderBase, V2ShopOrderCreate, V2ShopOrderResponse,
    V2ExchangeLogBase, V2ExchangeLogCreate, V2ExchangeLogResponse
)
from app.v2.models.v2_ops_execution_result import V2OpsExecutionResult # Needed for admin_ops_plan API

# Import additional models for table creation
from app.models.ops_plan import OpsCampaign, OpsPlan, OpsPlanTask
from app.models.ops_target import OpsTargetList
from app.models.ops_eval_metric import OpsEvalMetric
from app.models.external_ranking import ExternalRankingData  # For admin_cc_deposit
from app.models.user import User

# --- DB & APP SETUP ---

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        # Seed a minimal admin user to satisfy potential FK constraints.
        if db.query(User).filter(User.id == 1).first() is None:
            db.add(User(id=1, external_id="test-admin-1", nickname="Test Admin"))
            db.commit()
        yield db
    finally:
        db.close()

@pytest.fixture(scope="function")
def client(db_session):
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

# --- SCHEMA COVERAGE ---

def test_schema_instantiation():
    """Exercise Pydantic schemas to hit 100% coverage."""
    # level_xp
    reward_log = LevelRewardLog(
        level=10, 
        reward_type="POINT", 
        auto_granted=True, 
        granted_at=datetime.utcnow()
    )
    xp_status = LevelXPStatusResponse(
        current_level=5, 
        current_xp=1000, 
        rewards=[reward_log]
    )
    assert xp_status.current_level == 5

    # mission
    m_schema = MissionSchema(
        id=1, title="Test", category="DAILY", logic_key="PLAY", 
        target_value=1, reward_type="POINT", reward_amount=100
    )
    m_progress = MissionProgressSchema(current_value=0, is_completed=False, is_claimed=False)
    m_with_p = MissionWithProgress(mission=m_schema, progress=m_progress)
    streak = StreakInfoSchema(current_streak=3, current_multiplier=1.2, is_hot=True, is_legend=False, next_milestone=7)
    m_list = MissionListResponse(missions=[m_with_p], streak_info=streak)
    assert m_list.streak_info.current_streak == 3

    # level_reward
    v2_lr = V2LevelRewardRow(level=1, required_xp=0, reward_type="POINT", reward_amount=100)
    v2_lrt = V2LevelRewardTableResponse(rows=[v2_lr])
    assert len(v2_lrt.rows) == 1

    # shop_exchange
    v2_so = V2ShopOrderBase(user_id=1, sku="S1", name="N1", cost_type="VAULT", cost_amount=10, reward_type="P", reward_amount=100)
    assert v2_so.sku == "S1"

# --- ADMIN API ROUTE COVERAGE ---

def test_admin_segment_api(client):
    # Stats
    resp = client.get("/api/v2/admin/segments/stats")
    assert resp.status_code == 200
    assert "segments" in resp.json()

    # Rule CRUD
    payload = {"label": "Test Rule", "targetSegment": "VIP", "rule": "vault_balance > 1000"}
    resp = client.post("/api/v2/admin/segments/rules", json=payload)
    assert resp.status_code == 201
    rule_id = resp.json()["id"]

    resp = client.get("/api/v2/admin/segments/rules")
    assert resp.status_code == 200

    resp = client.put(f"/api/v2/admin/segments/rules/{rule_id}", json={"label": "Updated Rule"})
    assert resp.status_code == 200

    resp = client.delete(f"/api/v2/admin/segments/rules/{rule_id}")
    assert resp.status_code == 200

def test_admin_user_list_api(client):
    resp = client.get("/api/v2/admin/users?limit=5")
    assert resp.status_code == 200
    assert "users" in resp.json()

def test_admin_vault_api(client):
    resp = client.get("/api/v2/admin/vault/stats")
    assert resp.status_code == 200

    resp = client.get("/api/v2/admin/vault/trend")
    assert resp.status_code == 200

def test_admin_cc_deposit_api(client):
    # Mock some data if needed, but first check if route exists and returns 200
    resp = client.get("/admin/api/external-ranking/")
    assert resp.status_code == 200

def test_admin_ops_plan_api(client):
    # Campaign
    payload = {"name": "Test Campaign", "status": "ACTIVE", "description": "Desc"}
    resp = client.post("/admin/api/ops/campaigns", json=payload)
    assert resp.status_code == 201
    camp_id = resp.json()["id"]

    resp = client.get("/admin/api/ops/campaigns")
    assert resp.status_code == 200
