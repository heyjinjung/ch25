import pytest
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
from unittest.mock import patch

from app.db.base_class import Base
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.models.dice import DiceConfig, DiceLog
from app.v2.models.user import V2User
from app.v2.services.vault_service import V2VaultService


@pytest.fixture(scope="function")
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def setup_valid_user(db, user_id: int, locked: int):
    cc_id = f"cc{user_id:03d}"

    v2_user = V2User(
        id=user_id,
        cc_id=cc_id,
        nickname=f"u{user_id}",
        vault_locked_balance=locked,
        vault_spent_today=10_000,
        vault_spent_reset_date=datetime.now(ZoneInfo("Asia/Seoul")).strftime("%Y-%m-%d"),
    )
    db.add(v2_user)

    cfg = DiceConfig(
        name=f"test_cfg_{user_id}",
        is_active=True,
    )
    db.add(cfg)
    db.flush()

    # 출금 조건의 "최근 3일 내 플레이"는 (여러 게임 로그를 합산하는) 활동성 조건이다.
    # 테스트에서는 대표 케이스로 DiceLog만 시드해서 플레이 수(기본 30)를 충족한다.
    for i in range(30):
        db.add(
            DiceLog(
                user_id=user_id,
                config_id=cfg.id,
                user_dice_1=1,
                user_dice_2=1,
                user_sum=2,
                dealer_dice_1=1,
                dealer_dice_2=1,
                dealer_sum=2,
                result="DRAW",
                reward_type="NONE",
                reward_amount=0,
                created_at=datetime.utcnow(),
            )
        )

    now_kst = datetime.now(ZoneInfo("Asia/Seoul")).date()
    for kst_date in (now_kst, now_kst - timedelta(days=1)):
        db.add(
            ExternalRankingDailyDepositDelta(
                user_id=user_id,
                kst_date=kst_date,
                deposit_delta=10_000,
            )
        )

    db.commit()
    return v2_user


def seed_approved_withdrawals(db, user_id: int, count: int):
    for i in range(count):
        db.add(
            VaultWithdrawalRequest(
                user_id=user_id,
                amount=10_000,
                status="APPROVED",
                created_at=datetime.utcnow(),
                processed_at=datetime.utcnow(),
            )
        )
    db.commit()


def test_v2_withdrawal_tiers_min_balance(db_session):
    with patch("app.v2.services.vault_service.get_settings") as MockSettings:
        MockSettings.return_value.timezone = "Asia/Seoul"
        MockSettings.return_value.streak_day_reset_hour_kst = 9

        service = V2VaultService()

        # Tier 1 (approved 0): require >= 10,000
        setup_valid_user(db_session, user_id=1, locked=10_000)
        res = service.request_withdrawal(db_session, 1, 10_000)
        assert res["status"] == "PENDING"

        # Tier 2 (approved 1): require >= 10,000
        setup_valid_user(db_session, user_id=2, locked=10_000)
        seed_approved_withdrawals(db_session, 2, 1)
        res = service.request_withdrawal(db_session, 2, 10_000)
        assert res["status"] == "PENDING"

        # Tier 3 (approved 2): require >= 30,000
        setup_valid_user(db_session, user_id=3, locked=20_000)
        seed_approved_withdrawals(db_session, 3, 2)
        with pytest.raises(HTTPException) as exc:
            service.request_withdrawal(db_session, 3, 10_000)
        assert "MIN_WITHDRAWAL_AMOUNT_30000" in str(exc.value.detail)

        setup_valid_user(db_session, user_id=4, locked=30_000)
        seed_approved_withdrawals(db_session, 4, 2)
        res = service.request_withdrawal(db_session, 4, 10_000)
        assert res["status"] == "PENDING"

        # Tier 4 (approved 3): require >= 50,000
        setup_valid_user(db_session, user_id=5, locked=40_000)
        seed_approved_withdrawals(db_session, 5, 3)
        with pytest.raises(HTTPException) as exc:
            service.request_withdrawal(db_session, 5, 10_000)
        assert "MIN_WITHDRAWAL_AMOUNT_50000" in str(exc.value.detail)

        setup_valid_user(db_session, user_id=6, locked=50_000)
        seed_approved_withdrawals(db_session, 6, 3)
        res = service.request_withdrawal(db_session, 6, 10_000)
        assert res["status"] == "PENDING"
