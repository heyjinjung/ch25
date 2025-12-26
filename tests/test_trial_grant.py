from app.models.game_wallet import GameTokenType, UserGameWallet


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
