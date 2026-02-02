import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException

from app.db.base_class import Base
from app.models.user import User
from app.schemas.admin_user import AdminUserCreate
from app.v2.models.user import V2User
from app.v2.services.admin_user_service import V2AdminUserService
from app.v2.services.vault2_service import Vault2Service
from app.models.vault_earn_event import VaultEarnEvent

@pytest.fixture()
def db_session() -> Session:
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
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()

def test_admin_user_service_crud(db_session: Session) -> None:
    service = V2AdminUserService()
    
    # 1. Create User
    payload = AdminUserCreate(
        cc_id="v2_tester_01",
        nickname="V2Tester",
        telegram_id=12345678,
        telegram_username="v2_tester_tg"
    )
    user = service.create_user(db_session, payload)
    db_session.commit()
    
    assert user.cc_id == "v2_tester_01"
    assert user.nickname == "V2Tester"
    
    # Duplicate check
    with pytest.raises(HTTPException) as exc:
        service.create_user(db_session, payload)
    assert exc.value.status_code == 409

    # 2. Resolve User ID
    resolved_id = service.resolve_user_id(db_session, "v2_tester_01")
    assert resolved_id == user.id
    
    resolved_id_tg = service.resolve_user_id(db_session, "v2_tester_tg")
    assert resolved_id_tg == user.id

    # 3. Build Summary
    summary = service.build_summary(user)
    assert summary.cc_id == "v2_tester_01"
    assert summary.tg_id == 12345678

    # 4. Delete User
    service.delete_user(db_session, user.id, admin_id=999)
    assert db_session.get(User, user.id) is None

def test_vault2_stats_aggregation(db_session: Session) -> None:
    service = Vault2Service()
    
    # Create test data
    user = User(id=1, external_id="u1", vault_locked_balance=1000)
    v2_user = V2User(id=1, cc_id="u1", vault_locked_balance=1000)
    db_session.add(user)
    db_session.add(v2_user)
    
    event = VaultEarnEvent(
        user_id=1,
        earn_event_id="TEST:EARN:DICE:001",
        amount=500,
        earn_type="DICE",
        source="GAME",
        created_at=datetime.utcnow()
    )
    db_session.add(event)
    db_session.commit()
    
    # 1. Get Stats
    stats = service.get_vault_stats(db_session)
    assert stats["total_locked"] == 1000
    assert "DICE" in stats["today_accrual"]
    assert stats["today_accrual"]["DICE"]["total"] == 500

    # 2. Get Detail Stats
    details = service.get_vault_detail_stats(db_session, type="today_accrual")
    assert len(details) == 1
    assert details[0]["user_id"] == 1
    assert details[0]["amount"] == 500
    
    details_liabilities = service.get_vault_detail_stats(db_session, type="liabilities")
    assert len(details_liabilities) == 1
    assert details_liabilities[0]["amount"] == 1000

def test_admin_user_identifier_logic() -> None:
    service = V2AdminUserService()
    
    assert service._identifier_kind("12345") == "numeric"
    assert service._identifier_kind("tg_123_abc") == "tg_external_id"
    assert service._identifier_kind("@username") == "username"
    assert service._identifier_kind("some_text") == "text"
    
    assert service._identifier_fingerprint("  Test  ") == service._identifier_fingerprint("test")
    assert len(service._identifier_fingerprint("test")) == 10
