from datetime import datetime, timedelta

from zoneinfo import ZoneInfo

from app.core.config import get_settings
from app.api.deps import get_db
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.game_wallet_ledger import UserGameWalletLedger


def test_trial_grant_grants_once_per_day_when_empty(client, session_factory):
    db = session_factory()
    wallet = (
        db.query(UserGameWallet)
        .filter(UserGameWallet.user_id == 1, UserGameWallet.token_type == GameTokenType.DICE_TOKEN)
        .one_or_none()
    )
    if wallet is None:
        wallet = UserGameWallet(user_id=1, token_type=GameTokenType.DICE_TOKEN, balance=0)
    else:
        wallet.balance = 0
    db.add(wallet)
    db.commit()

    payload = {"token_type": "DICE_TOKEN"}
    first = client.post("/api/trial-grant", json=payload)
    assert first.status_code == 200
    data1 = first.json()
    assert data1["result"] == "OK"
    assert data1["granted"] == 1
    assert data1["balance"] == 1
    assert isinstance(data1.get("label"), str)

    second = client.post("/api/trial-grant", json=payload)
    assert second.status_code == 200
    data2 = second.json()
    assert data2["result"] == "SKIP"
    assert data2["granted"] == 0
    assert data2["balance"] >= 1


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

    # Ensure wallet is empty.
    wallet = (
        db.query(UserGameWallet)
        .filter(UserGameWallet.user_id == 1, UserGameWallet.token_type == GameTokenType.DICE_TOKEN)
        .one_or_none()
    )
    if wallet is None:
        wallet = UserGameWallet(user_id=1, token_type=GameTokenType.DICE_TOKEN, balance=0)
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
            token_type=GameTokenType.DICE_TOKEN,
            delta=1,
            balance_after=1,
            reason="TRIAL_GRANT",
            label="TRIAL_DICE_TOKEN_2000-01-01",
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
            UserGameWalletLedger.token_type == GameTokenType.DICE_TOKEN,
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

    wallet = (
        db.query(UserGameWallet)
        .filter(UserGameWallet.user_id == 1, UserGameWallet.token_type == GameTokenType.DICE_TOKEN)
        .one_or_none()
    )
    if wallet is None:
        wallet = UserGameWallet(user_id=1, token_type=GameTokenType.DICE_TOKEN, balance=0)
    else:
        wallet.balance = 0
    db.add(wallet)
    db.commit()

    payload = {"token_type": "DICE_TOKEN"}
    resp = client.post("/api/trial-grant", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["result"] == "OK"
    assert data["granted"] == 1
    assert data["balance"] == 1
