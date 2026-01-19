"""TDD: V2 vault consistency tests."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.v2.db.base import Base
from app.v2.models.user import V2User
from app.v2.services.vault_service import V2VaultService


def _session_factory():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def test_vault_locked_balance_is_single_source_of_truth():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        user = V2User(id=1, cc_id="CC-1", vault_locked_balance=0)
        db.add(user)
        db.commit()

        V2VaultService.deposit(db, user_id=1, amount=500)
        db.commit()

        assert V2VaultService.get_locked_balance(db, 1) == 500
        assert not hasattr(user, "vault_balance")
        assert not hasattr(user, "vault_available_balance")
    finally:
        db.close()


def test_vault_withdraw_fails_when_insufficient():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        user = V2User(id=2, cc_id="CC-2", vault_locked_balance=100)
        db.add(user)
        db.commit()

        try:
            V2VaultService.withdraw(db, user_id=2, amount=200)
            assert False, "expected insufficient locked balance error"
        except ValueError as exc:
            assert str(exc) == "insufficient locked balance"
    finally:
        db.close()
