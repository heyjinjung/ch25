import os
os.environ["ENV"] = "dev"

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base_class import Base  # SQLAlchemy Base

try:
    from app.main import app  # FastAPI 앱
    from app.api.deps import get_db  # DB 세션 의존성
except ModuleNotFoundError:
    app = None
    get_db = None

# 테스트용 DB URL (환경에 맞게 수정)
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite:///./test.db")

# 테스트용 엔진/세션
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # 모델 등록 (circular import 회피를 위해 함수 내부 import)
    import app.db.base
    
    # 모든 테이블 생성 (v2_user 등 포함)
    Base.metadata.create_all(bind=engine)
    yield
    # 테스트 종료 후 테이블 삭제
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def test_db_session():
    """각 테스트마다 독립적인 DB 세션 제공 (롤백 보장)"""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()

@pytest.fixture(scope="function")
def db(test_db_session):
    return test_db_session

# FastAPI 의존성 오버라이드 (테스트 세션 사용)
@pytest.fixture(scope="function", autouse=True)
def override_get_db(test_db_session):
    if app is None or get_db is None:
        yield
        return
    app.dependency_overrides[get_db] = lambda: test_db_session
    yield
    app.dependency_overrides.clear()

# Global Mock for Redis Events
@pytest.fixture(scope="session", autouse=True)
def mock_golden_events():
    from unittest.mock import patch, MagicMock
    # Use a MagicMock for the redis client to prevent real connections
    mock_client = MagicMock()
    with patch("redis.from_url", return_value=mock_client), \
         patch("app.v2.services.golden_event_service.GoldenV2EventService.get_redis_client", return_value=mock_client):
        yield
