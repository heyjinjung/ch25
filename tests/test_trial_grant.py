from datetime import datetime, timedelta

from zoneinfo import ZoneInfo

from app.core.config import get_settings
from app.api.deps import get_db
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.game_wallet_ledger import UserGameWalletLedger
from app.services.trial_grant_service import TrialGrantService


def test_trial_grant_grants_once_per_day_when_empty(client, session_factory):
    db = session_factory()
    # Reset both the requested token wallet and the unified TRIAL_TOKEN wallet.
    for token_type in (GameTokenType.DICE_TOKEN, GameTokenType.TRIAL_TOKEN):
        wallet = (
            db.query(UserGameWallet)
            .filter(UserGameWallet.user_id == 1, UserGameWallet.token_type == token_type)
            .one_or_none()
        )
        if wallet is None:
            wallet = UserGameWallet(user_id=1, token_type=token_type, balance=0)
        else:
            wallet.balance = 0
        db.add(wallet)
    db.commit()

    payload = {"token_type": "DICE_TOKEN"}
    first = client.post("/api/trial-grant", json=payload)
    assert first.status_code == 200
    data1 = first.json()
    assert data1["result"] == "OK"
    # DICE_TOKEN requests are redirected to TRIAL_TOKEN grants (amount: 3).
    assert data1["granted"] == 3
    assert data1["balance"] == 3
    assert isinstance(data1.get("label"), str)

    second = client.post("/api/trial-grant", json=payload)
    assert second.status_code == 200
    data2 = second.json()
    assert data2["result"] == "SKIP"
    assert data2["granted"] == 0
    assert data2["balance"] >= 3


def test_trial_grant_skips_when_balance_positive(client):
    payload = {"token_type": "ROULETTE_COIN"}
    resp = client.post("/api/trial-grant", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["result"] == "SKIP"
    assert data["granted"] == 0


def test_trial_grant_prob_after_first_can_skip_non_first_time_user(client, session_factory, monkeypatch):
    monkeypatch.setenv("TRIAL_GRANT_PROB_AFTER_FIRST", "0")
    monkeypatch.setenv("TRIAL_GRANT_FIRST_TIME_GUARANTEE", "true")
    monkeypatch.setenv("TRIAL_DAILY_CAP", "1")
    monkeypatch.setenv("TRIAL_WEEKLY_CAP", "0")
    get_settings.cache_clear()

    db = session_factory()

    # Ensure both the requested token wallet and TRIAL_TOKEN wallet are empty.
    for token_type in (GameTokenType.DICE_TOKEN, GameTokenType.TRIAL_TOKEN):
        wallet = (
            db.query(UserGameWallet)
            .filter(UserGameWallet.user_id == 1, UserGameWallet.token_type == token_type)
            .one_or_none()
        )
        if wallet is None:
            wallet = UserGameWallet(user_id=1, token_type=token_type, balance=0)
        else:
            wallet.balance = 0
        db.add(wallet)
    db.commit()

    # Insert a historical trial grant ledger (yesterday KST) to make this user "non-first-time".
    now_kst = datetime.now(ZoneInfo("Asia/Seoul"))
    yesterday_utc_naive = (now_kst - timedelta(days=1)).astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
    db.add(
        UserGameWalletLedger(
            user_id=1,
            token_type=GameTokenType.TRIAL_TOKEN,
            delta=3,
            balance_after=3,
            reason="TRIAL_GRANT",
            label="TRIAL_TRIAL_TOKEN_2000-01-01",
            meta_json={"source": "ticket_zero"},
            created_at=yesterday_utc_naive,
        )
    )
    db.commit()

    # Ensure our inserted ledger is visible with the same query shape as the service.
    assert (
        db.query(UserGameWalletLedger)
        .filter(
            UserGameWalletLedger.user_id == 1,
            UserGameWalletLedger.token_type == GameTokenType.TRIAL_TOKEN,
            UserGameWalletLedger.delta > 0,
            UserGameWalletLedger.reason == "TRIAL_GRANT",
        )
        .count()
        == 1
    )

    # Use the same DB session for the request to avoid cross-session visibility edge cases.
    def override_get_db():
        yield db

    client.app.dependency_overrides[get_db] = override_get_db

    # With probability=0, non-first-time grants should be skipped even if balance is 0.
    payload = {"token_type": "DICE_TOKEN"}
    resp = client.post("/api/trial-grant", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["result"] == "SKIP"
    assert data["granted"] == 0
    assert data["balance"] == 0

    client.app.dependency_overrides.pop(get_db, None)


def test_trial_grant_first_time_still_grants_even_when_prob_zero(client, session_factory, monkeypatch):
    monkeypatch.setenv("TRIAL_GRANT_PROB_AFTER_FIRST", "0")
    monkeypatch.setenv("TRIAL_GRANT_FIRST_TIME_GUARANTEE", "true")
    monkeypatch.setenv("TRIAL_DAILY_CAP", "1")
    monkeypatch.setenv("TRIAL_WEEKLY_CAP", "0")
    get_settings.cache_clear()

    db = session_factory()

    # Ensure both the requested token wallet and TRIAL_TOKEN wallet are empty.
    for token_type in (GameTokenType.DICE_TOKEN, GameTokenType.TRIAL_TOKEN):
        wallet = (
            db.query(UserGameWallet)
            .filter(UserGameWallet.user_id == 1, UserGameWallet.token_type == token_type)
            .one_or_none()
        )
        if wallet is None:
            wallet = UserGameWallet(user_id=1, token_type=token_type, balance=0)
        else:
            wallet.balance = 0
        db.add(wallet)
    db.commit()

    payload = {"token_type": "DICE_TOKEN"}
    resp = client.post("/api/trial-grant", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["result"] == "OK"
    assert data["granted"] == 3
    assert data["balance"] == 3


def test_trial_grant_does_not_grant_premium_keys(client, session_factory):
    db = session_factory()

    # Ensure premium key wallets exist and are empty.
    for token_type in (GameTokenType.GOLD_KEY, GameTokenType.DIAMOND_KEY):
        wallet = (
            db.query(UserGameWallet)
            .filter(UserGameWallet.user_id == 1, UserGameWallet.token_type == token_type)
            .one_or_none()
        )
        if wallet is None:
            wallet = UserGameWallet(user_id=1, token_type=token_type, balance=0)
        else:
            wallet.balance = 0
        db.add(wallet)
    db.commit()

    for token_type in ("GOLD_KEY", "DIAMOND_KEY"):
        resp = client.post("/api/trial-grant", json={"token_type": token_type})
        assert resp.status_code == 200
        data = resp.json()
        assert data["result"] == "SKIP"
        assert data["granted"] == 0
        assert data["balance"] == 0


def test_trial_grant_daily_total_cap_blocks_additional_token_types(session_factory, monkeypatch):
    # Even if the allowed token list expands in the future, daily total trial grants must be capped.
    monkeypatch.setenv("ENABLE_TRIAL_GRANT_AUTO", "true")
    get_settings.cache_clear()

    db = session_factory()
    svc = TrialGrantService()

    # Simulate a future scenario where GOLD_KEY could be (incorrectly) added to the allowed set.
    svc._allowed_trial_token_types = {
        GameTokenType.ROULETTE_COIN,
        GameTokenType.DICE_TOKEN,
        GameTokenType.LOTTERY_TICKET,
        GameTokenType.GOLD_KEY,
    }
    svc._daily_total_cap = 3

    # Ensure wallets exist and are empty.
    for token_type in (
        GameTokenType.ROULETTE_COIN,
        GameTokenType.DICE_TOKEN,
        GameTokenType.LOTTERY_TICKET,
        GameTokenType.GOLD_KEY,
    ):
        wallet = (
            db.query(UserGameWallet)
            .filter(UserGameWallet.user_id == 1, UserGameWallet.token_type == token_type)
            .one_or_none()
        )
        if wallet is None:
            wallet = UserGameWallet(user_id=1, token_type=token_type, balance=0)
        else:
            wallet.balance = 0
        db.add(wallet)
    db.commit()

    # Insert 3 trial grants for today (KST) across the 3 ticket types.
    today_kst = datetime.now(ZoneInfo("Asia/Seoul")).date()
    start_utc, _ = svc._kst_day_bounds_utc(today_kst)
    created_at = start_utc + timedelta(hours=1)

    for t in (GameTokenType.ROULETTE_COIN, GameTokenType.DICE_TOKEN, GameTokenType.LOTTERY_TICKET):
        db.add(
            UserGameWalletLedger(
                user_id=1,
                token_type=t,
                delta=1,
                balance_after=1,
                reason="TRIAL_GRANT",
                label=f"TRIAL_{t.value}_{today_kst.isoformat()}",
                meta_json={"source": "ticket_zero", "date": today_kst.isoformat()},
                created_at=created_at,
            )
        )
    db.commit()

    # Now a 4th trial grant attempt (for a different token type) must be blocked by the global cap.
    granted, balance, label = svc.grant_daily_if_empty(db, user_id=1, token_type=GameTokenType.GOLD_KEY)
    assert granted == 0
    assert balance == 0
    assert label is None
