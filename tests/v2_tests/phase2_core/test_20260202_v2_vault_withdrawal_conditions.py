from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException

from app.db.base_class import Base
from app.v2.models.user import V2User
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.v2.models.v2_dice import V2DiceConfig, V2DiceLog
from app.v2.services.vault_service import V2VaultService


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
        v2_user = V2User(
            id=1,
            cc_id="v2_withdraw_01",
            nickname="WithdrawUser",
            created_at=datetime.now(timezone.utc) - timedelta(days=10),
            vault_locked_balance=20000,
            vault_spent_today=0,
            vault_spent_reset_date=None,
        )
        db.add(v2_user)
        db.commit()
        yield db
    finally:
        db.close()
        engine.dispose()


def _seed_deposit_today(db: Session, service: V2VaultService, amount: int = 500000) -> None:
    now = datetime.now(timezone.utc)
    op_date_kst = service._operational_date_kst(now)
    db.add(
        ExternalRankingDailyDepositDelta(
            user_id=1,
            kst_date=op_date_kst,
            deposit_delta=amount,
        )
    )
    db.commit()


def _seed_v2_dice_plays(db: Session, count: int) -> None:
    config = V2DiceConfig(name="TEST", ticket_type="DICE_TICKET")
    db.add(config)
    db.commit()
    db.refresh(config)

    now = datetime.utcnow()
    logs = []
    for i in range(count):
        logs.append(
            V2DiceLog(
                user_id=1,
                config_id=config.id,
                user_dice_1=1,
                user_dice_2=1,
                user_sum=2,
                dealer_dice_1=1,
                dealer_dice_2=1,
                dealer_sum=2,
                result="DRAW",
                reward_type="NONE",
                reward_amount=0,
                created_at=now - timedelta(minutes=i),
            )
        )
    db.add_all(logs)
    db.commit()


def _set_spent_today(db: Session, service: V2VaultService, amount: int) -> None:
    user = db.get(V2User, 1)
    op_date_kst = service._operational_date_kst(datetime.now(timezone.utc))
    user.vault_spent_reset_date = op_date_kst.strftime("%Y-%m-%d")
    user.vault_spent_today = amount
    db.add(user)
    db.commit()


def test_withdrawal_requires_deposit_today(db_session: Session) -> None:
    service = V2VaultService()
    _set_spent_today(db_session, service, 5000)

    with pytest.raises(HTTPException) as exc:
        service.request_withdrawal(db_session, user_id=1, amount=10000)

    assert exc.value.status_code == 403
    assert exc.value.detail == "DEPOSIT_REQUIRED_TODAY"


def test_withdrawal_requires_play_count(db_session: Session) -> None:
    service = V2VaultService()
    _seed_deposit_today(db_session, service, 500000)
    _set_spent_today(db_session, service, 5000)

    with pytest.raises(HTTPException) as exc:
        service.request_withdrawal(db_session, user_id=1, amount=10000)

    assert exc.value.status_code == 403
    assert exc.value.detail == "PLAY_COUNT_INSUFFICIENT_15"


def test_withdrawal_requires_spend_target(db_session: Session) -> None:
    service = V2VaultService()
    _seed_deposit_today(db_session, service, 500000)
    _seed_v2_dice_plays(db_session, 15)
    _set_spent_today(db_session, service, 0)

    with pytest.raises(HTTPException) as exc:
        service.request_withdrawal(db_session, user_id=1, amount=10000)

    assert exc.value.status_code == 403
    assert exc.value.detail == "VAULT_SPENT_INSUFFICIENT_5000"


def test_withdrawal_success_vip_conditions(db_session: Session) -> None:
    service = V2VaultService()
    _seed_deposit_today(db_session, service, 500000)
    _seed_v2_dice_plays(db_session, 15)
    _set_spent_today(db_session, service, 5000)

    result = service.request_withdrawal(db_session, user_id=1, amount=10000)

    assert result["status"] == "PENDING"
    assert result["amount"] == 10000
    assert result["balance_after"] >= 0
