from datetime import datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base_class import Base
from app.v2.services.vault2_service import Vault2Service


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


def test_vault2_config_merge_and_program_creation(db_session: Session) -> None:
    service = Vault2Service()

    # Internal helpers
    merged = service._build_effective_config({"probability": {"DICE": {"p_win": 0.5}}, "new_key": 1})
    assert merged["probability"]["DICE"]["p_win"] == 0.5
    assert merged["probability"]["DICE"]["p_draw"] is not None
    assert merged["new_key"] == 1

    program = service.get_default_program(db_session, ensure=True)
    assert program is not None
    assert program.key == service.DEFAULT_PROGRAM_KEY

    assert service.get_config_value(db_session, "eligibility_mode") == "all"

    # Update config and ensure audit path is exercised.
    service.toggle_game_earn(db_session, program_key=service.DEFAULT_PROGRAM_KEY, enabled=False, admin_id=1)
    assert service.get_config_value(db_session, "enable_game_earn_events") is False


def test_vault2_eligibility_branches(db_session: Session) -> None:
    service = Vault2Service()
    _ = service.get_default_program(db_session, ensure=True)

    user_id = 101

    # Default mode=all
    assert service.get_eligibility(db_session, program_key=service.DEFAULT_PROGRAM_KEY, user_id=user_id) is True

    service.upsert_eligibility(db_session, program_key=service.DEFAULT_PROGRAM_KEY, user_id=user_id, eligible=False, admin_id=1)
    assert service.get_eligibility(db_session, program_key=service.DEFAULT_PROGRAM_KEY, user_id=user_id) is False

    service.upsert_eligibility(db_session, program_key=service.DEFAULT_PROGRAM_KEY, user_id=user_id, eligible=True, admin_id=1)
    assert service.get_eligibility(db_session, program_key=service.DEFAULT_PROGRAM_KEY, user_id=user_id) is True

    # Allowlist mode
    service.update_config_value(
        db_session,
        program_key=service.DEFAULT_PROGRAM_KEY,
        key="eligibility_mode",
        value="allowlist",
        admin_id=1,
    )

    other_user = 202
    assert service.get_eligibility(db_session, program_key=service.DEFAULT_PROGRAM_KEY, user_id=other_user) is False
    assert service.get_eligibility(db_session, program_key=service.DEFAULT_PROGRAM_KEY, user_id=user_id) is True

    # Segment override branch
    service.update_config_value(
        db_session,
        program_key=service.DEFAULT_PROGRAM_KEY,
        key="eligibility_segment_allow",
        value="VIP",
        admin_id=1,
    )
    assert service.get_eligibility(db_session, program_key=service.DEFAULT_PROGRAM_KEY, user_id=user_id) is False


def test_vault2_compute_expires_at(db_session: Session) -> None:
    service = Vault2Service()
    locked_at = datetime(2026, 1, 20, 0, 0, 0)

    assert service.compute_expires_at(locked_at, duration_hours=0) is None
    expires = service.compute_expires_at(locked_at, duration_hours=24)
    assert expires is not None
    assert (expires - locked_at).total_seconds() == 24 * 3600
