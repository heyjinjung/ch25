"""Tests for vault unlock hook triggered by external ranking deposit increase."""

from sqlalchemy.orm import Session

from app.models.new_member_dice import NewMemberDiceEligibility
from app.models.user import User
from app.models.user_cash_ledger import UserCashLedger
from app.schemas.external_ranking import ExternalRankingCreate
from app.services.admin_external_ranking_service import AdminExternalRankingService


def test_external_ranking_deposit_increase_unlocks_vault_to_cash(session_factory) -> None:
    session: Session = session_factory()

    # Eligible new user with locked vault balance
    user = User(id=1, external_id="tester", status="ACTIVE", vault_balance=10_000, cash_balance=0)
    session.add(user)
    session.add(NewMemberDiceEligibility(user_id=1, is_eligible=True, campaign_key="test"))
    session.commit()

    # First upsert counts as increase from 0 -> 1 (any increase triggers)
    AdminExternalRankingService.upsert_many(
        session,
        [ExternalRankingCreate(user_id=1, deposit_amount=1, play_count=0)],
    )

    session.expire_all()
    updated = session.get(User, 1)
    assert updated is not None
    assert updated.vault_balance == 0
    assert updated.cash_balance == 10_000

    ledger = session.query(UserCashLedger).filter(UserCashLedger.user_id == 1).all()
    assert len(ledger) == 1
    assert ledger[0].delta == 10_000
    assert ledger[0].reason == "VAULT_UNLOCK"

    # Second upsert with increased deposit should not double-unlock (vault already 0)
    AdminExternalRankingService.upsert_many(
        session,
        [ExternalRankingCreate(user_id=1, deposit_amount=2, play_count=0)],
    )
    session.expire_all()
    updated2 = session.get(User, 1)
    assert updated2 is not None
    assert updated2.vault_balance == 0
    assert updated2.cash_balance == 10_000

    ledger2 = session.query(UserCashLedger).filter(UserCashLedger.user_id == 1).all()
    assert len(ledger2) == 1

    session.close()
