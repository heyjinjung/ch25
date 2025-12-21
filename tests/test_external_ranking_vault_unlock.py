"""Tests for vault unlock hook triggered by external ranking deposit increase."""

from sqlalchemy.orm import Session

from app.models.new_member_dice import NewMemberDiceEligibility
from app.models.user import User
from app.models.user_cash_ledger import UserCashLedger
from app.schemas.external_ranking import ExternalRankingCreate
from app.services.admin_external_ranking_service import AdminExternalRankingService


def test_external_ranking_deposit_increase_unlocks_vault_to_cash(session_factory) -> None:
    session: Session = session_factory()

    # Eligible new user with locked vault balance (Phase 1: locked is source of truth)
    user = User(
        id=1,
        external_id="tester",
        status="ACTIVE",
        vault_locked_balance=10_000,
        vault_balance=10_000,  # legacy mirror
        cash_balance=0,
    )
    session.add(user)
    session.add(NewMemberDiceEligibility(user_id=1, is_eligible=True, campaign_key="test"))
    session.commit()

    # Option A: 10,000 charge => unlock 5,000 and keep 5,000 locked
    AdminExternalRankingService.upsert_many(
        session,
        [ExternalRankingCreate(user_id=1, deposit_amount=10_000, play_count=0)],
    )

    session.expire_all()
    updated = session.get(User, 1)
    assert updated is not None
    assert updated.vault_locked_balance == 5_000
    assert updated.vault_balance == 5_000
    assert updated.cash_balance == 5_000

    ledger = session.query(UserCashLedger).filter(UserCashLedger.user_id == 1).all()
    assert len(ledger) == 1
    assert ledger[0].delta == 5_000
    assert ledger[0].reason == "VAULT_UNLOCK"

    # Option B: additional 50,000 charge => unlock remaining 5,000 (target is 10,000 but only 5,000 remains)
    AdminExternalRankingService.upsert_many(
        session,
        [ExternalRankingCreate(user_id=1, deposit_amount=60_000, play_count=0)],
    )
    session.expire_all()
    updated2 = session.get(User, 1)
    assert updated2 is not None
    assert updated2.vault_locked_balance == 0
    assert updated2.vault_balance == 0
    assert updated2.cash_balance == 10_000

    ledger2 = session.query(UserCashLedger).filter(UserCashLedger.user_id == 1).all()
    assert len(ledger2) == 2
    assert sum(entry.delta for entry in ledger2) == 10_000

    session.close()
