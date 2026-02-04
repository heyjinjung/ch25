from datetime import datetime, timedelta, timezone
from typing import Generator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base_class import Base
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.v2.models.user import V2User
from app.v2.services.segment_service import V2SegmentService


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
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


def _seed_user(db: Session, user_id: int, now: datetime) -> None:
    """
    세그먼트 테스트용 유저 생성.
    - created_at: now 기준 10일 전 (NEW 세그먼트 조건 7일 초과)
    - telegram_id: 설정됨
    """
    user = V2User(
        id=user_id,
        cc_id=f"segment_{user_id}",
        nickname=f"Segment{user_id}",
        telegram_id=f"tg_{user_id}",
        created_at=now - timedelta(days=10),  # now 기준 10일 전 (NEW 조건 불충족)
    )
    db.add(user)
    db.commit()


def _seed_deposit_7d(db: Session, user_id: int, amount: int, now: datetime) -> None:
    """
    7일 입금 데이터 시딩.
    - ExternalRankingDailyDepositDelta: 7일 입금 계산용
    - ExternalRankingData: has_charge_history 계산용 (NEW 세그먼트 제외)
    """
    # 7일 입금 델타 (VIP/WHALE 판정용)
    db.add(
        ExternalRankingDailyDepositDelta(
            user_id=user_id,
            kst_date=now.date(),
            deposit_delta=amount,
        )
    )
    # ExternalRankingData 추가 (has_charge_history=True로 만들어 NEW 제외)
    db.add(
        ExternalRankingData(
            user_id=user_id,
            deposit_amount=amount,
        )
    )
    db.commit()


def test_segment_thresholds_vip_at_3m(db_session: Session) -> None:
    """VIP 세그먼트: 7일 입금 >= 3,000,000"""
    now = datetime(2026, 2, 2, tzinfo=timezone.utc)
    _seed_user(db_session, 1, now)
    _seed_deposit_7d(db_session, 1, 3_000_000, now)

    result = V2SegmentService.segment_user(db_session, 1, now=now)

    assert result.segment == "VIP"


def test_segment_thresholds_whale_at_5m(db_session: Session) -> None:
    """WHALE 세그먼트: 7일 입금 >= 5,000,000"""
    now = datetime(2026, 2, 2, tzinfo=timezone.utc)
    _seed_user(db_session, 2, now)
    _seed_deposit_7d(db_session, 2, 5_000_000, now)

    result = V2SegmentService.segment_user(db_session, 2, now=now)

    assert result.segment == "WHALE"


def test_segment_thresholds_common_below_3m(db_session: Session) -> None:
    """COMMON 세그먼트: 7일 입금 < 3,000,000"""
    now = datetime(2026, 2, 2, tzinfo=timezone.utc)
    _seed_user(db_session, 3, now)
    _seed_deposit_7d(db_session, 3, 2_999_999, now)

    result = V2SegmentService.segment_user(db_session, 3, now=now)

    assert result.segment == "COMMON"
