"""TDD: V2 ticket zero log model."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.v2.db.base import Base
from app.v2.models.v2_ticket_zero_log import V2TicketZeroLog


def _session_factory():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def test_ticket_zero_log_created():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        log = V2TicketZeroLog(
            user_id=1,
            ticket_type="ROULETTE_TICKET",
            ticket_amount=1,
            reason="BAILOUT_GRANT",
        )
        db.add(log)
        db.commit()

        saved = db.get(V2TicketZeroLog, log.id)
        assert saved is not None
        assert saved.user_id == 1
        assert saved.ticket_type == "ROULETTE_TICKET"
        assert saved.ticket_amount == 1
        assert saved.reason == "BAILOUT_GRANT"
    finally:
        db.close()
