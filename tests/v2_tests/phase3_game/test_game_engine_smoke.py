import uuid
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user_id, get_db
from app.main import app
from app.models.dice import DiceConfig
from app.models.feature import FeatureConfig, FeatureType
from app.models.game_wallet import GameTokenType
from app.models.lottery import LotteryConfig, LotteryPrize
from app.models.roulette import RouletteConfig, RouletteSegment
from app.models.user import User
from app.services.game_wallet_service import GameWalletService


@pytest.fixture()
def test_engine():
    """SQLite in-memory engine for local test runs.

    - StaticPool: keep a single connection for the whole test.
    - check_same_thread=False: allow FastAPI TestClient threadpool usage.
    """

    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    from app.db.base_class import Base
    import app.db.base  # noqa: F401

    Base.metadata.create_all(bind=engine)

    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture()
def seed_session(test_engine) -> Session:
    SessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(test_engine) -> TestClient:
    SessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)

    def _override_get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.pop(get_db, None)


def _ensure_feature_config(db: Session, feature_type: FeatureType) -> None:
    row = db.query(FeatureConfig).filter(FeatureConfig.feature_type == feature_type).one_or_none()
    if row is None:
        row = FeatureConfig(
            feature_type=feature_type,
            title=feature_type.value,
            page_path=f"/{feature_type.value.lower()}",
            is_enabled=True,
            config_json={},
        )
    else:
        row.is_enabled = True
    db.add(row)
    db.flush()


def _seed_user(db: Session) -> User:
    user = User(
        external_id=f"test-{uuid.uuid4().hex}",
        nickname="Phase3 Test User",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        vault_locked_balance=10000,
    )
    db.add(user)
    db.flush()
    return user


def _seed_dice_config(db: Session) -> DiceConfig:
    # Keep existing configs untouched; just add an active one for this test.
    config = DiceConfig(
        name="Phase3 Dice Config",
        is_active=True,
        max_daily_plays=0,
        win_probability=0.4,
        draw_probability=0.1,
        lose_probability=0.5,
        win_reward_type="NONE",
        win_reward_amount=0,
        draw_reward_type="NONE",
        draw_reward_amount=0,
        lose_reward_type="NONE",
        lose_reward_amount=0,
        daily_gain_cap=20000,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(config)
    db.flush()
    return config


def _seed_lottery_config(db: Session) -> LotteryConfig:
    config = LotteryConfig(
        name="Phase3 Lottery Config",
        is_active=True,
        max_daily_tickets=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(config)
    db.flush()

    prizes = [
        LotteryPrize(
            config_id=config.id,
            label="P3 Prize A",
            reward_type="NONE",
            reward_amount=0,
            weight=1,
            stock=None,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        ),
        LotteryPrize(
            config_id=config.id,
            label="P3 Prize B",
            reward_type="NONE",
            reward_amount=0,
            weight=1,
            stock=None,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        ),
    ]
    db.add_all(prizes)
    db.flush()
    return config


def _seed_roulette_config(db: Session) -> RouletteConfig:
    config = RouletteConfig(
        name="Phase3 Roulette Config",
        ticket_type=GameTokenType.ROULETTE_COIN.value,
        is_active=True,
        max_daily_spins=0,
        grade="COMMON",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(config)
    db.flush()

    segments = []
    for i in range(6):
        segments.append(
            RouletteSegment(
                config_id=config.id,
                slot_index=i,
                label=f"P3 Slot {i}",
                reward_type="NONE",
                reward_amount=0,
                weight=1,
                is_jackpot=False,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
        )

    db.add_all(segments)
    db.flush()
    return config


def _grant_game_tickets(db: Session, user_id: int) -> None:
    wallet = GameWalletService()
    wallet.grant_tokens(db, user_id, GameTokenType.ROULETTE_COIN, 10, reason="TEST")
    wallet.grant_tokens(db, user_id, GameTokenType.DICE_TOKEN, 10, reason="TEST")
    wallet.grant_tokens(db, user_id, GameTokenType.LOTTERY_TICKET, 10, reason="TEST")


def _override_auth(app_user_id: int) -> None:
    app.dependency_overrides[get_current_user_id] = lambda: app_user_id


def _clear_auth_override() -> None:
    app.dependency_overrides.pop(get_current_user_id, None)


def _disable_benefit_suspension(monkeypatch: pytest.MonkeyPatch) -> None:
    # RouletteService uses instance method; LotteryService calls VaultService.get_user_vault_policy
    from app.services import vault_service

    def _no_suspend(*args, **kwargs):
        # Keep shape compatible with VaultService.get_user_vault_policy().
        return {
            "status": "ACTIVE",
            "recency_multiplier": 1.0,
            "benefits_suspended": False,
            "vault_max_limit": 0,
        }

    monkeypatch.setattr(vault_service.VaultService, "get_user_vault_policy", staticmethod(_no_suspend), raising=False)


def test_phase3_game_endpoints_smoke(client: TestClient, seed_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    _disable_benefit_suspension(monkeypatch)

    for feature in (FeatureType.ROULETTE, FeatureType.DICE, FeatureType.LOTTERY):
        _ensure_feature_config(seed_session, feature)

    # Ensure deterministic config selection for services that use scalar_one_or_none().
    seed_session.query(DiceConfig).filter(DiceConfig.is_active.is_(True)).update({"is_active": False})
    seed_session.query(LotteryConfig).filter(LotteryConfig.is_active.is_(True)).update({"is_active": False})

    user = _seed_user(seed_session)
    _seed_roulette_config(seed_session)
    _seed_dice_config(seed_session)
    _seed_lottery_config(seed_session)
    _grant_game_tickets(seed_session, user.id)
    seed_session.commit()

    _override_auth(user.id)
    try:
        # Roulette
        r = client.get("/api/v2/roulette/status")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "segments" in data
        assert isinstance(data["segments"], list)
        assert len(data["segments"]) == 6

        r = client.post("/api/v2/roulette/play", json={})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "segment" in data
        assert "reward_amount" in data["segment"]

        # Dice
        r = client.get("/api/v2/dice/status")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token_balance" in data

        r = client.post("/api/v2/dice/play")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "game_data" in data
        assert "reward_amount" in data["game_data"]

        # Lottery
        r = client.get("/api/v2/lottery/status")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "prize_preview" in data
        assert isinstance(data["prize_preview"], list)
        assert len(data["prize_preview"]) >= 1

        r = client.post("/api/v2/lottery/play")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "prize" in data
        assert "reward_amount" in data["prize"]
    finally:
        _clear_auth_override()
