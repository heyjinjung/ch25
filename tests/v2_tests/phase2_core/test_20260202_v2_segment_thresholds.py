from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base_class import Base
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.v2.models.user import V2User
from app.v2.services.segment_service import V2SegmentService


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


def _seed_user(db: Session, user_id: int) -> None:
    user = V2User(
        id=user_id,
        cc_id=f"segment_{user_id}",
        nickname=f"Segment{user_id}",
        telegram_id=f"tg_{user_id}",
        created_at=datetime.now(timezone.utc) - timedelta(days=10),
    )
    db.add(user)
    db.commit()


def _seed_deposit_7d(db: Session, user_id: int, amount: int, now: datetime) -> None:
    db.add(
        ExternalRankingDailyDepositDelta(
            user_id=user_id,
            kst_date=now.date(),
            deposit_delta=amount,
        )
    )
    db.commit()


def test_segment_thresholds_vip_at_3m(db_session: Session) -> None:
    now = datetime(2026, 2, 2, tzinfo=timezone.utc)
    _seed_user(db_session, 1)
    _seed_deposit_7d(db_session, 1, 3_000_000, now)

    result = V2SegmentService.segment_user(db_session, 1, now=now)

    assert result.segment == "VIP"


def test_segment_thresholds_whale_at_5m(db_session: Session) -> None:
    now = datetime(2026, 2, 2, tzinfo=timezone.utc)
    _seed_user(db_session, 2)
    _seed_deposit_7d(db_session, 2, 5_000_000, now)

    result = V2SegmentService.segment_user(db_session, 2, now=now)

    assert result.segment == "WHALE"


def test_segment_thresholds_common_below_3m(db_session: Session) -> None:
    now = datetime(2026, 2, 2, tzinfo=timezone.utc)
    _seed_user(db_session, 3)
    _seed_deposit_7d(db_session, 3, 2_999_999, now)

    result = V2SegmentService.segment_user(db_session, 3, now=now)

    assert result.segment == "COMMON"
