import uuid
from datetime import datetime, date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.main import app
from app.models.feature import FeatureConfig, FeatureType
from app.models.game_wallet import GameTokenType
from app.models.user import User
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.services.game_wallet_service import GameWalletService
from app.v2.api.deps import get_current_user_id
from app.v2.models.user import V2User
from app.v2.models.v2_dice import V2DiceConfig
from app.v2.models.v2_lottery import V2LotteryConfig, V2LotteryPrize
from app.v2.models.v2_roulette import V2RouletteConfig, V2RouletteSegment
from app.v2.services.user_service import V2UserService


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
    import app.v2.db.base  # noqa: F401

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


def _seed_v2_user(db: Session) -> V2User:
    v2_user = V2User(
        cc_id=f"test-{uuid.uuid4().hex}",
        nickname="Phase3 V2 Test User",
        vault_locked_balance=10000,
    )
    db.add(v2_user)
    db.flush()
    
    # Add deposit history to satisfy Strict Vault Policy (7-day no-deposit check)
    deposit = ExternalRankingDailyDepositDelta(
        user_id=v2_user.id,
        kst_date=date.today(),
        deposit_delta=10000
    )
    db.add(deposit)
    db.flush()
    
    return v2_user


def _seed_dice_config(db: Session) -> V2DiceConfig:
    config = V2DiceConfig(
        name="Phase3 V2 Dice Config",
        ticket_type="DICE_TICKET",
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
    )
    db.add(config)
    db.flush()
    return config


def _seed_lottery_config(db: Session) -> V2LotteryConfig:
    config = V2LotteryConfig(
        name="Phase3 V2 Lottery Config",
        ticket_type="LOTTERY_TICKET",
        is_active=True,
        max_daily_tickets=0,
        puzzle_piece_probability=0.0,
    )
    db.add(config)
    db.flush()

    prizes = [
        V2LotteryPrize(
            config_id=config.id,
            label="P3 V2 Prize A",
            reward_type="NONE",
            reward_amount=0,
            weight=1,
            stock=None,
            is_active=True,
        ),
        V2LotteryPrize(
            config_id=config.id,
            label="P3 V2 Prize B",
            reward_type="NONE",
            reward_amount=0,
            weight=1,
            stock=None,
            is_active=True,
        ),
    ]
    db.add_all(prizes)
    db.flush()
    return config


def _seed_roulette_config(db: Session) -> V2RouletteConfig:
    config = V2RouletteConfig(
        name="Phase3 V2 Roulette Config",
        ticket_type="ROULETTE_TICKET",
        is_active=True,
        max_daily_spins=0,
        grade="COMMON",
    )
    db.add(config)
    db.flush()

    segments = []
    for i in range(8):
        segments.append(
            V2RouletteSegment(
                config_id=config.id,
                slot_index=i,
                label=f"P3 V2 Slot {i}",
                reward_type="NONE",
                reward_amount=0,
                weight=1,
                is_jackpot=False,
            )
        )

    db.add_all(segments)
    db.flush()
    return config


def _grant_game_tickets(db: Session, user_id: int) -> None:
    wallet = GameWalletService()
    wallet.grant_tokens(db, user_id, GameTokenType.ROULETTE_TICKET, 10, reason="TEST")
    wallet.grant_tokens(db, user_id, GameTokenType.DICE_TICKET, 10, reason="TEST")
    wallet.grant_tokens(db, user_id, GameTokenType.LOTTERY_TICKET, 10, reason="TEST")


def _override_auth(app_user_id: int) -> None:
    app.dependency_overrides[get_current_user_id] = lambda: app_user_id


def _clear_auth_override() -> None:
    app.dependency_overrides.pop(get_current_user_id, None)


def _disable_benefit_suspension(monkeypatch: pytest.MonkeyPatch) -> None:
    # RouletteService uses instance method; LotteryService calls VaultService.get_user_vault_policy
    from app.services import vault_service
    from app.v2.services.vault_service import V2VaultService

    def _no_suspend(*args, **kwargs):
        # Keep shape compatible with VaultService.get_user_vault_policy().
        return {
            "status": "ACTIVE",
            "recency_multiplier": 1.0,
            "benefits_suspended": False,
            "vault_max_limit": 0,
        }

    def _no_suspend_v2(*args, **kwargs):
        return False, 0

    monkeypatch.setattr(vault_service.VaultService, "get_user_vault_policy", staticmethod(_no_suspend), raising=False)
    monkeypatch.setattr(V2VaultService, "is_benefits_suspended", staticmethod(_no_suspend_v2), raising=False)


def test_phase3_game_endpoints_smoke(client: TestClient, seed_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    _disable_benefit_suspension(monkeypatch)

    for feature in (FeatureType.ROULETTE, FeatureType.DICE, FeatureType.LOTTERY):
        _ensure_feature_config(seed_session, feature)

    v2_user = _seed_v2_user(seed_session)
    legacy_user_id = V2UserService.ensure_legacy_user_id(seed_session, v2_user.id)

    user = seed_session.get(User, legacy_user_id)
    if user is None:
        user = _seed_user(seed_session)

    _seed_roulette_config(seed_session)
    _seed_dice_config(seed_session)
    _seed_lottery_config(seed_session)
    _grant_game_tickets(seed_session, legacy_user_id)
    seed_session.commit()

    _override_auth(int(v2_user.id))
    try:
        # Roulette
        r = client.get("/api/v2/roulette/status")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "segments" in data
        assert isinstance(data["segments"], list)
        assert len(data["segments"]) == 8

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

        r = client.post("/api/v2/dice/play", json={"bet_amount": 100, "prediction": "EVEN"})
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


def test_roulette_reward_diamond_ticket_is_credited_to_legacy_wallet_when_ids_diverge(
    client: TestClient, seed_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """엣지케이스: v2_user.id != legacy user.id 인 환경에서
    룰렛 보상(예: DIAMOND_TICKET)이 실제 티켓 저장소(user_game_wallet, legacy user_id)에 적재되어야 한다.
    """

    _disable_benefit_suspension(monkeypatch)
    _ensure_feature_config(seed_session, FeatureType.ROULETTE)

    # SQLite in-memory에서는 v2_user/user가 각각 id=1부터 시작해 우연히 동일해질 수 있어
    # 엣지케이스(IDs diverge)를 재현하기 위해 더미 legacy user로 id를 선점한다.
    _seed_user(seed_session)

    v2_user = _seed_v2_user(seed_session)
    legacy_user_id = V2UserService.ensure_legacy_user_id(seed_session, v2_user.id)

    # 이 테스트는 ID가 분리되는 환경을 강제한다(문제 재현용).
    assert int(legacy_user_id) != int(v2_user.id)

    # 룰렛 티켓 1장 지급(스핀 소비용)
    wallet = GameWalletService()
    wallet.grant_tokens(seed_session, legacy_user_id, GameTokenType.ROULETTE_TICKET, 1, reason="TEST")

    # 보상은 DIAMOND_TICKET 1장으로 고정(랜덤 제거)
    config = V2RouletteConfig(
        name="Edge Roulette Config",
        ticket_type="ROULETTE_TICKET",
        is_active=True,
        max_daily_spins=0,
        grade="COMMON",
    )
    seed_session.add(config)
    seed_session.flush()
    seg = V2RouletteSegment(
        config_id=config.id,
        slot_index=0,
        label="EDGE_DIAMOND_TICKET",
        reward_type="DIAMOND_TICKET",
        reward_amount=1,
        weight=1,
        is_jackpot=False,
    )
    seed_session.add(seg)
    seed_session.commit()

    _override_auth(int(v2_user.id))
    try:
        r = client.post("/api/v2/roulette/play", json={"ticket_type": "ROULETTE_TICKET"})
        assert r.status_code == 200, r.text

        # 보상은 legacy user_id(티켓 저장소 FK 대상)에 적재되어야 한다.
        diamond_balance = wallet.get_balance(seed_session, legacy_user_id, GameTokenType.DIAMOND_TICKET)
        assert int(diamond_balance) == 1
    finally:
        _clear_auth_override()
