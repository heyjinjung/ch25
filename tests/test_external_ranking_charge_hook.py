"""Tests for last_charge_at hook driven by external_ranking_data updates."""

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_activity import UserActivity
from app.schemas.external_ranking import ExternalRankingCreate
from app.services.admin_external_ranking_service import AdminExternalRankingService


def test_external_ranking_deposit_increase_updates_last_charge_at(session_factory) -> None:
    session: Session = session_factory()
    session.add(User(id=1, external_id="tester", status="ACTIVE"))
    session.commit()

    # First insert counts as increase from 0 -> 100
    AdminExternalRankingService.upsert_many(
        session,
        [ExternalRankingCreate(user_id=1, deposit_amount=100, play_count=0)],
    )
    session.expire_all()
    activity = session.query(UserActivity).filter(UserActivity.user_id == 1).one()
    assert activity.last_charge_at is not None
    first_charge_at = activity.last_charge_at

    # Same amount: should not change
    AdminExternalRankingService.upsert_many(
        session,
        [ExternalRankingCreate(user_id=1, deposit_amount=100, play_count=0)],
    )
    session.expire_all()
    activity = session.query(UserActivity).filter(UserActivity.user_id == 1).one()
    assert activity.last_charge_at == first_charge_at

    # Increase: should update
    AdminExternalRankingService.upsert_many(
        session,
        [ExternalRankingCreate(user_id=1, deposit_amount=200, play_count=0)],
    )
    session.expire_all()
    activity = session.query(UserActivity).filter(UserActivity.user_id == 1).one()
    assert activity.last_charge_at is not None
    assert activity.last_charge_at >= first_charge_at

    session.close()
