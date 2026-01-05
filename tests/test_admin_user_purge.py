from datetime import datetime, timedelta

import pytest

from app.models.user import User
from app.models.telegram_link_code import TelegramLinkCode
from app.models.game_wallet import GameTokenType
from app.models.game_wallet_ledger import UserGameWalletLedger
from app.services.game_wallet_service import GameWalletService
from app.services.admin_user_service import AdminUserService


def test_admin_purge_user_removes_user_and_identity_rows(session_factory):
    db = session_factory()

    user = User(id=1, external_id="u1", nickname="tester", telegram_id=123456789)
    db.add(user)
    db.commit()

    # Seed some related data that commonly blocks re-testing.
    db.add(
        TelegramLinkCode(
            code="ABCDEF1234567890"[:16],
            user_id=1,
            expires_at=datetime.utcnow() + timedelta(hours=1),
            used_at=None,
        )
    )
    db.commit()

    GameWalletService().grant_tokens(db, 1, GameTokenType.ROULETTE_COIN, 1, auto_commit=True)
    assert db.query(UserGameWalletLedger).filter(UserGameWalletLedger.user_id == 1).count() >= 1

    # Purge
    AdminUserService.purge_user(db, user_id=1, admin_id=999)

    assert db.get(User, 1) is None
    assert db.query(TelegramLinkCode).filter(TelegramLinkCode.user_id == 1).count() == 0
    assert db.query(UserGameWalletLedger).filter(UserGameWalletLedger.user_id == 1).count() == 0
