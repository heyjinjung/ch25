"""Key roulette behavior tests (ticket consumption + key rewards)."""

from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.feature import FeatureConfig, FeatureSchedule, FeatureType
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.roulette import RouletteConfig, RouletteSegment
from app.models.user import User


def _seed_common(session: Session) -> None:
    today = date.today()
    session.add(User(id=1, external_id="tester", status="ACTIVE"))
    session.add(FeatureConfig(feature_type=FeatureType.ROULETTE, title="Roulette", page_path="/roulette", is_enabled=True))
    session.add(FeatureSchedule(date=today, feature_type=FeatureType.ROULETTE, is_active=True))


def _wallet_balance(session: Session, token_type: GameTokenType) -> int:
    wallet = session.execute(
        select(UserGameWallet).where(UserGameWallet.user_id == 1, UserGameWallet.token_type == token_type)
    ).scalar_one_or_none()
    return int(wallet.balance) if wallet is not None else 0


def test_roulette_play_with_gold_key_deducts_one_ticket(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    _seed_common(session)
    cfg = RouletteConfig(name="KEY_ONLY", is_active=True, ticket_type=GameTokenType.GOLD_KEY.value, max_daily_spins=0)
    session.add(cfg)
    session.flush()
    session.add_all(
        [
            RouletteSegment(
                config_id=cfg.id,
                slot_index=i,
                label=f"S{i}",
                reward_type="NONE",
                reward_amount=0,
                weight=1,
            )
            for i in range(6)
        ]
    )
    session.commit()
    before = _wallet_balance(session, GameTokenType.GOLD_KEY)
    session.close()

    resp = client.post("/api/roulette/play", json={"ticket_type": "GOLD_KEY"})
    assert resp.status_code == 200

    verify: Session = session_factory()
    after = _wallet_balance(verify, GameTokenType.GOLD_KEY)
    verify.close()
    assert after == before - 1


def test_roulette_key_reward_grants_keys_to_wallet(client: TestClient, session_factory) -> None:
    session: Session = session_factory()
    _seed_common(session)
    cfg = RouletteConfig(name="COIN_ROU", is_active=True, ticket_type=GameTokenType.ROULETTE_COIN.value, max_daily_spins=0)
    session.add(cfg)
    session.flush()
    # Deterministic: every slot grants 2 GOLD_KEY.
    session.add_all(
        [
            RouletteSegment(
                config_id=cfg.id,
                slot_index=i,
                label=f"S{i}",
                reward_type="GOLD_KEY",
                reward_amount=2,
                weight=1,
            )
            for i in range(6)
        ]
    )
    session.commit()
    before = _wallet_balance(session, GameTokenType.GOLD_KEY)
    session.close()

    resp = client.post("/api/roulette/play", json={"ticket_type": "ROULETTE_COIN"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["result"] == "OK"
    assert body["segment"]["reward_type"] == "GOLD_KEY"
    assert body["segment"]["reward_amount"] == 2

    verify: Session = session_factory()
    after = _wallet_balance(verify, GameTokenType.GOLD_KEY)
    verify.close()
    assert after == before + 2

