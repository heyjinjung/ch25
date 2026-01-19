"""TDD: V2 ticket conversion policy model."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.v2.db.base import Base
from app.v2.models.v2_ticket_conversion_policy import V2TicketConversionPolicy


def _session_factory():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def test_ticket_conversion_policy_created():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        policy = V2TicketConversionPolicy(
            target_ticket_type="ROULETTE_TICKET",
            ratio_numerator=2,
            ratio_denominator=5,
            is_active=True,
        )
        db.add(policy)
        db.commit()

        saved = db.get(V2TicketConversionPolicy, policy.id)
        assert saved is not None
        assert saved.target_ticket_type == "ROULETTE_TICKET"
        assert saved.ratio_numerator == 2
        assert saved.ratio_denominator == 5
        assert saved.is_active is True
    finally:
        db.close()
