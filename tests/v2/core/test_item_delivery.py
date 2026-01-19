"""TDD: V2 exchange log recording."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.v2.db.base import Base
from app.v2.models.v2_exchange_log import V2ExchangeLog
from app.v2.services.inventory_service import V2InventoryService


def _session_factory():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def test_exchange_log_created():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        record = V2InventoryService.log_exchange(
            db,
            user_id=1,
            input_type="GOLD_KEY_FRAGMENT",
            input_amount=10,
            output_type="GOLD_KEY_TICKET",
            output_amount=1,
        )
        db.commit()

        saved = db.get(V2ExchangeLog, record.id)
        assert saved is not None
        assert saved.output_type == "GOLD_KEY_TICKET"
    finally:
        db.close()
