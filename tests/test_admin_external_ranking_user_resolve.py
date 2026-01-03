import pytest

from fastapi import HTTPException

from app.models.user import User
from app.schemas.external_ranking import ExternalRankingCreate
from app.services.admin_external_ranking_service import AdminExternalRankingService


@pytest.fixture
def db_session(session_factory):
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def test_upsert_resolves_by_telegram_username_case_insensitive(db_session):
    user = User(
        external_id="ext-telegram-resolve",
        nickname="NickTelegram",
        telegram_username="SomeUser",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    svc = AdminExternalRankingService()
    rows = svc.upsert_many(
        db_session,
        [
            ExternalRankingCreate(
                telegram_username="@someuser",
                deposit_amount=123,
                play_count=0,
                memo="by telegram",
            )
        ],
    )

    assert len(rows) == 1
    assert rows[0].user_id == user.id


def test_upsert_resolves_by_nickname_when_external_id_not_found(db_session):
    user = User(
        external_id="ext-nickname-resolve",
        nickname="MyNickname",
        telegram_username=None,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    svc = AdminExternalRankingService()
    rows = svc.upsert_many(
        db_session,
        [
            # NOTE: Admin UI currently sends identifier in `external_id` field.
            # We support nickname resolution as a fallback when external_id match fails.
            ExternalRankingCreate(
                external_id="MyNickname",
                deposit_amount=999,
                play_count=10,
                memo="by nickname",
            )
        ],
    )

    assert len(rows) == 1
    assert rows[0].user_id == user.id


def test_upsert_ambiguous_nickname_raises_409(db_session):
    u1 = User(external_id="ext-dup-1", nickname="DupNick")
    u2 = User(external_id="ext-dup-2", nickname="DupNick")
    db_session.add_all([u1, u2])
    db_session.commit()

    svc = AdminExternalRankingService()
    with pytest.raises(HTTPException) as exc:
        svc.upsert_many(
            db_session,
            [ExternalRankingCreate(external_id="DupNick", deposit_amount=1, play_count=0)],
        )

    assert exc.value.status_code == 409
