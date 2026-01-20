from __future__ import annotations

import uuid
from collections.abc import Generator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.user import User
from app.v2.models.v2_golden_intervention_log import V2GoldenInterventionLog
from app.v2.models.v2_user_retention_state import V2UserRetentionState
from app.v2.services.golden_intervention_service import GoldenInterventionService


@pytest.fixture()
def test_engine() -> Generator[Engine, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    from app.db.base_class import Base
    import app.db.base  # noqa: F401

    # Ensure V2 tables are registered on Base.metadata.
    import app.v2.models  # noqa: F401
    import app.v2.models.v2_golden_intervention_log  # noqa: F401

    Base.metadata.create_all(bind=engine)

    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture()
def db(test_engine: Engine) -> Generator[Session, None, None]:
    SessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _seed_user(db: Session) -> User:
    user = User(
        external_id=f"test-{uuid.uuid4().hex}",
        nickname="Golden Test User",
        vault_locked_balance=0,
    )
    db.add(user)
    db.flush()
    return user


def _seed_retention_state(db: Session, user_id: int) -> V2UserRetentionState:
    state = V2UserRetentionState(user_id=user_id)
    db.add(state)
    db.flush()
    return state


def test_check_lose_streak_trigger_creates_log_and_sets_cooldown(db: Session) -> None:
    user = _seed_user(db)
    state = _seed_retention_state(db, user.id)
    db.commit()

    svc = GoldenInterventionService(db)

    recent_results = ["LOSE", "LOSE", "LOSE", "LOSE", "LOSE"]
    log = svc.check_lose_streak_trigger(user_id=user.id, recent_results=recent_results, cooldown_hours=1)
    assert log is not None
    assert log.trigger_id == "TRG_LOSE_5"

    db.refresh(state)
    assert state.last_intervention_at is not None

    # On cooldown now
    again = svc.check_lose_streak_trigger(user_id=user.id, recent_results=recent_results, cooldown_hours=1)
    assert again is None

    rows = db.query(V2GoldenInterventionLog).filter_by(user_id=user.id, trigger_id="TRG_LOSE_5").all()
    assert len(rows) == 1


def test_check_lose_streak_trigger_returns_none_when_not_enough_results(db: Session) -> None:
    user = _seed_user(db)
    _seed_retention_state(db, user.id)
    db.commit()

    svc = GoldenInterventionService(db)
    log = svc.check_lose_streak_trigger(user_id=user.id, recent_results=["LOSE"])
    assert log is None


def test_check_balance_drop_trigger_updates_session_delta_and_sets_cooldown(db: Session) -> None:
    user = _seed_user(db)
    state = _seed_retention_state(db, user.id)
    db.commit()

    svc = GoldenInterventionService(db)

    log = svc.check_balance_drop_trigger(
        user_id=user.id,
        session_start_balance=1000,
        current_balance=400,
        drop_threshold=0.5,
        cooldown_hours=1,
    )
    assert log is not None
    assert log.trigger_id == "TRG_BAL_DROP_50"

    db.refresh(state)
    assert state.session_balance_delta == -600
    assert state.last_intervention_at is not None

    # On cooldown now
    again = svc.check_balance_drop_trigger(
        user_id=user.id,
        session_start_balance=1000,
        current_balance=400,
        drop_threshold=0.5,
        cooldown_hours=1,
    )
    assert again is None

    rows = db.query(V2GoldenInterventionLog).filter_by(user_id=user.id, trigger_id="TRG_BAL_DROP_50").all()
    assert len(rows) == 1
