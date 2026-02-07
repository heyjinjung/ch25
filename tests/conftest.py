import os
os.environ["ENV"] = "dev"
os.environ["CIRCUIT_LIMIT_VAULT"] = "1000000000"
os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest
import sys
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.base_class import Base  # SQLAlchemy Base
from app.core.config import get_settings
from app.core.security import create_access_token
from app.v2.models import User
from app.v2.models.user import V2User, V2UserRole, V2UserStatus

# 테스트용 DB URL (환경에 맞게 수정)
# 기본값은 in-memory SQLite로, 테스트 간 데이터 잔존/파일 잠금 이슈를 방지한다.
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite+pysqlite:///:memory:")
# Settings.database_url은 필수값이므로, 테스트에서는 TEST_DATABASE_URL을 DATABASE_URL로 강제한다.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

# 테스트용 엔진/세션
_is_sqlite = TEST_DATABASE_URL.startswith("sqlite")
if _is_sqlite:
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=Session,
    bind=engine,
)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # 모델 등록 (circular import 회피를 위해 함수 내부 import)
    import app.db.base

    # sqlite 파일 DB는 이전 실행 데이터가 남아 UNIQUE 충돌을 유발할 수 있어,
    # 세션 시작 시 무조건 초기화한다.
    if TEST_DATABASE_URL.startswith("sqlite:///") and ":memory:" not in TEST_DATABASE_URL:
        # 예: sqlite:///./test.db, sqlite:///C:/path/to/test.db
        db_path = TEST_DATABASE_URL.replace("sqlite:///", "", 1)
        if db_path.startswith("./"):
            db_path = os.path.abspath(db_path)

        try:
            engine.dispose()
        except Exception:
            pass

        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except PermissionError:
                # 파일 삭제가 불가한 경우(잠금 등)라도 drop_all로 초기화 시도
                pass

    # 모든 테이블 생성 (v2_user 등 포함)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    # 테스트 종료 후 테이블 삭제
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def test_db_session():
    """각 테스트마다 독립적인 DB 세션 제공 (롤백 보장)"""
    connection = engine.connect()
    transaction = connection.begin()

    # 앱 코드/테스트 코드 어디서든 SessionLocal()을 호출하더라도,
    # 동일 connection/외부 트랜잭션 하에서 SAVEPOINT가 자동 재시작되도록 강제한다.
    import app.db.session as app_db_session

    original_sessionlocal = getattr(app_db_session, "SessionLocal", None)

    def _make_scoped_session() -> Session:
        scoped = TestingSessionLocal(bind=connection)
        scoped.begin_nested()

        @event.listens_for(scoped, "after_transaction_end")
        def _restart_savepoint(sess, trans):
            parent = getattr(trans, "_parent", None)
            if trans.nested and parent is not None and not parent.nested:
                sess.begin_nested()

        return scoped

    patched_modules: list[object] = []
    if original_sessionlocal is not None:
        for module in list(sys.modules.values()):
            if module is None:
                continue
            if hasattr(module, "SessionLocal") and getattr(module, "SessionLocal", None) is original_sessionlocal:
                setattr(module, "SessionLocal", _make_scoped_session)
                patched_modules.append(module)

        # app.db.session 자체도 교체
        app_db_session.SessionLocal = _make_scoped_session

    session = _make_scoped_session()
    try:
        yield session
    finally:
        # SessionLocal 패치 복구
        if original_sessionlocal is not None:
            for module in patched_modules:
                try:
                    setattr(module, "SessionLocal", original_sessionlocal)
                except Exception:
                    pass
            try:
                app_db_session.SessionLocal = original_sessionlocal
            except Exception:
                pass

        session.close()

        # 1) 외부 트랜잭션 롤백 시도 (정상 케이스)
        try:
            transaction.rollback()
        except Exception:
            pass

        # 2) 방어적 정리: 어떤 코드가 commit()으로 트랜잭션 경계를 깨더라도
        #    다음 테스트에 데이터가 남지 않도록 모든 테이블을 비운다.
        try:
            with connection.begin():
                for table in reversed(Base.metadata.sorted_tables):
                    connection.execute(table.delete())
        except Exception:
            pass

        connection.close()

@pytest.fixture(scope="function")
def db(test_db_session):
    return test_db_session

# FastAPI 의존성 오버라이드 (테스트 세션 사용)
@pytest.fixture(scope="function", autouse=True)
def override_get_db(test_db_session):
    try:
        from app.main import app  # FastAPI 앱
        from app.v2.api.deps import get_db  # V2 DB 세션 의존성
    except (ModuleNotFoundError, ImportError):
        app = None
        get_db = None

    if app is None or get_db is None:
        yield
        return

    def _override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = _override_get_db
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


@pytest.fixture(scope="function")
def test_client():
    os.environ.setdefault("TEST_MODE", "1")
    get_settings.cache_clear()
    from app.main import app

    with TestClient(app) as client:
        yield client


@pytest.fixture(scope="function")
def db_session(test_db_session):
    return test_db_session


@pytest.fixture(scope="function")
def base_user(test_db_session):
    v1_user = User(
        id=9001,
        external_id="test_v1_user_9001",
        nickname="test_v1_user",
    )
    v2_user = V2User(
        id=9001,
        cc_id="test_v2_user_9001",
        nickname="test_v2_user",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE,
    )
    test_db_session.add_all([v1_user, v2_user])
    test_db_session.commit()
    return v2_user


@pytest.fixture(scope="function")
def admin_token(test_db_session):
    admin = test_db_session.query(V2User).filter(V2User.cc_id == "admin_test_9000").first()
    if admin is None:
        admin = V2User(
            id=9000,
            cc_id="admin_test_9000",
            nickname="admin_test",
            role=V2UserRole.ADMIN,
            status=V2UserStatus.ACTIVE,
        )
        test_db_session.add(admin)
        test_db_session.commit()
        test_db_session.refresh(admin)

    return create_access_token(int(admin.id), role="ADMIN")
