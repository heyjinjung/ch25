"""TDD: VaultService withdrawal policy (Phase 2 / Strict Vault Policy).

Covers:
- Same-day net deposit increase (cc_deposit) eligibility
- Daily vault spend eligibility (vault_spent_today)
- Tiered minimum withdrawal amount
- Concurrency guard: only one PENDING request

This suite uses sqlite in-memory and creates only required tables.
"""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base_class import Base
from app.models.external_ranking import ExternalRankingData
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.vault_earn_event import VaultEarnEvent
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.services.vault_service import VaultService


def _session_factory():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Create only the tables needed for this test file.
    User.__table__.create(bind=engine)
    ExternalRankingData.__table__.create(bind=engine)
    ExternalRankingDailyDepositDelta.__table__.create(bind=engine)
    UserActivity.__table__.create(bind=engine)
    VaultEarnEvent.__table__.create(bind=engine)
    VaultWithdrawalRequest.__table__.create(bind=engine)

    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def _seed_user(db, *, user_id: int, locked_balance: int, vault_spent_today: int):
    service = VaultService()
    now = datetime.now(timezone.utc)
    op_date = service._operational_date_kst(now)

    user = User(
        id=user_id,
        external_id=f"U-{user_id}",
        vault_locked_balance=locked_balance,
        vault_balance=locked_balance,
        vault_spent_today=vault_spent_today,
        vault_spent_reset_date=op_date.strftime("%Y-%m-%d"),
    )
    db.add(user)
    db.commit()
    return user


def _seed_game_plays(db, *, user_id: int, count: int):
    now_utc_naive = datetime.utcnow()
    for i in range(count):
        db.add(
            VaultEarnEvent(
                user_id=user_id,
                earn_event_id=f"TEST:GAME_PLAY:{user_id}:{i}",
                earn_type="GAME_PLAY",
                amount=0,
                source="TEST",
                created_at=now_utc_naive,
            )
        )
    db.commit()


def test_withdrawal_requires_daily_net_deposit_increase_or_fallbacks():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        _seed_user(db, user_id=1, locked_balance=100_000, vault_spent_today=10_000)

        # No delta row, no rank sync+increase, no activity => should fail.
        db.add(
            ExternalRankingData(
                user_id=1,
                deposit_amount=1000,
                daily_base_deposit=1000,
                updated_at=datetime(2000, 1, 1),
            )
        )
        db.commit()

        with pytest.raises(Exception) as exc:
            VaultService().request_withdrawal(db, user_id=1, amount=10_000)
        assert "DEPOSIT_REQUIRED_TODAY_NET" in str(exc.value) or "NO_DEPOSIT_HISTORY" in str(exc.value)
    finally:
        db.close()


def test_withdrawal_succeeds_with_today_net_deposit_delta_and_spent_today():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        service = VaultService()
        now = datetime.now(timezone.utc)
        op_date = service._operational_date_kst(now)

        _seed_user(db, user_id=2, locked_balance=100_000, vault_spent_today=10_000)
        _seed_game_plays(db, user_id=2, count=30)
        db.add(ExternalRankingDailyDepositDelta(user_id=2, kst_date=op_date, deposit_delta=50_000))
        db.commit()

        res = VaultService().request_withdrawal(db, user_id=2, amount=10_000)
        assert res["status"] == "PENDING"
        assert res["amount"] == 10_000
    finally:
        db.close()


def test_withdrawal_requires_spent_today_10000():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        service = VaultService()
        now = datetime.now(timezone.utc)
        op_date = service._operational_date_kst(now)

        _seed_user(db, user_id=3, locked_balance=100_000, vault_spent_today=9_999)
        _seed_game_plays(db, user_id=3, count=30)
        db.add(ExternalRankingDailyDepositDelta(user_id=3, kst_date=op_date, deposit_delta=10_000))
        db.commit()

        with pytest.raises(Exception) as exc:
            VaultService().request_withdrawal(db, user_id=3, amount=10_000)
        assert "MIN_DAILY_SPEND_10000_REQUIRED" in str(exc.value)
    finally:
        db.close()


def test_withdrawal_blocks_when_pending_request_exists():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        service = VaultService()
        now = datetime.now(timezone.utc)
        op_date = service._operational_date_kst(now)

        _seed_user(db, user_id=4, locked_balance=100_000, vault_spent_today=10_000)
        _seed_game_plays(db, user_id=4, count=30)
        db.add(ExternalRankingDailyDepositDelta(user_id=4, kst_date=op_date, deposit_delta=10_000))
        db.commit()

        VaultService().request_withdrawal(db, user_id=4, amount=10_000)

        with pytest.raises(Exception) as exc:
            VaultService().request_withdrawal(db, user_id=4, amount=10_000)
        assert "WITHDRAWAL_REQUEST_ALREADY_PENDING" in str(exc.value)
    finally:
        db.close()


def test_withdrawal_tiered_min_amount_after_two_withdrawals():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        service = VaultService()
        now = datetime.now(timezone.utc)
        op_date = service._operational_date_kst(now)

        _seed_user(db, user_id=5, locked_balance=200_000, vault_spent_today=10_000)
        _seed_game_plays(db, user_id=5, count=30)
        db.add(ExternalRankingDailyDepositDelta(user_id=5, kst_date=op_date, deposit_delta=10_000))

        # Two prior withdrawals (approved) => next min becomes 30,000
        db.add(VaultWithdrawalRequest(user_id=5, amount=10_000, status="APPROVED"))
        db.add(VaultWithdrawalRequest(user_id=5, amount=10_000, status="APPROVED"))
        db.commit()

        with pytest.raises(Exception) as exc:
            VaultService().request_withdrawal(db, user_id=5, amount=10_000)
        assert "MIN_WITHDRAWAL_AMOUNT_30000_REQUIRED" in str(exc.value)

        # 30,000 should pass
        res = VaultService().request_withdrawal(db, user_id=5, amount=30_000)
        assert res["status"] == "PENDING"
        assert res["amount"] == 30_000
    finally:
        db.close()


def test_withdrawal_requires_min_play_count_30():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        service = VaultService()
        now = datetime.now(timezone.utc)
        op_date = service._operational_date_kst(now)

        _seed_user(db, user_id=6, locked_balance=100_000, vault_spent_today=10_000)
        db.add(ExternalRankingDailyDepositDelta(user_id=6, kst_date=op_date, deposit_delta=10_000))
        db.commit()

        with pytest.raises(Exception) as exc:
            VaultService().request_withdrawal(db, user_id=6, amount=10_000)
        assert "MIN_PLAY_COUNT_30_REQUIRED" in str(exc.value)
    finally:
        db.close()
