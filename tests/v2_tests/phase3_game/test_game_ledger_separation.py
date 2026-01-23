import uuid
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.main import app
from app.models.feature import FeatureType
from app.models.game_wallet import GameTokenType
from app.models.game_wallet_ledger import UserGameWalletLedger
from app.models.inventory import UserInventoryLedger
from app.models.user import User
from app.models.vault_earn_event import VaultEarnEvent
from app.models.vault_ledger import VaultLedger
from app.services.game_wallet_service import GameWalletService
from app.v2.api.deps import get_current_user_id
from app.v2.models.user import V2User
from app.v2.services.user_service import V2UserService
from tests.v2_tests.phase3_game.test_game_engine_smoke import (
    _disable_benefit_suspension,
    _ensure_feature_config,
    _seed_dice_config,
    _seed_lottery_config,
    _seed_roulette_config,
)


@pytest.fixture()
def test_engine():
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


def _seed_user(db: Session) -> User:
    user = User(
        external_id=f"test-{uuid.uuid4().hex}",
        nickname="Ledger Test User",
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
        nickname="Ledger V2 User",
        vault_locked_balance=10000,
    )
    db.add(v2_user)
    db.flush()
    return v2_user


def _grant_game_tickets(db: Session, user_id: int) -> None:
    wallet = GameWalletService()
    wallet.grant_tokens(db, user_id, GameTokenType.ROULETTE_TICKET, 10, reason="TEST")
    wallet.grant_tokens(db, user_id, GameTokenType.DICE_TICKET, 10, reason="TEST")
    wallet.grant_tokens(db, user_id, GameTokenType.LOTTERY_TICKET, 10, reason="TEST")


def _override_auth(app_user_id: int) -> None:
    app.dependency_overrides[get_current_user_id] = lambda: app_user_id


def _clear_auth_override() -> None:
    app.dependency_overrides.pop(get_current_user_id, None)


def _count_wallet_ledger(db: Session, user_id: int, token_type: GameTokenType) -> int:
    return (
        db.query(UserGameWalletLedger)
        .filter(UserGameWalletLedger.user_id == user_id, UserGameWalletLedger.token_type == token_type)
        .count()
    )


def _count_inventory_ledger(db: Session, user_id: int) -> int:
    return db.query(UserInventoryLedger).filter(UserInventoryLedger.user_id == user_id).count()


def _count_vault_ledger(db: Session, user_id: int) -> int:
    return db.query(VaultLedger).filter(VaultLedger.user_id == user_id).count()


def _count_vault_earn_events(db: Session, user_id: int) -> int:
    return db.query(VaultEarnEvent).filter(VaultEarnEvent.user_id == user_id).count()


def _assert_ledger_separation(
    db: Session,
    client: TestClient,
    *,
    legacy_user_id: int,
    path: str,
    token_type: GameTokenType,
    payload: dict | None = None,
) -> None:
    wallet_before = _count_wallet_ledger(db, user_id=legacy_user_id, token_type=token_type)
    inventory_before = _count_inventory_ledger(db, user_id=legacy_user_id)
    vault_before = _count_vault_ledger(db, user_id=legacy_user_id)
    earn_before = _count_vault_earn_events(db, user_id=legacy_user_id)

    response = client.post(path, json=payload or {})
    assert response.status_code == 200, response.text

    wallet_after = _count_wallet_ledger(db, user_id=legacy_user_id, token_type=token_type)
    inventory_after = _count_inventory_ledger(db, user_id=legacy_user_id)
    vault_after = _count_vault_ledger(db, user_id=legacy_user_id)
    earn_after = _count_vault_earn_events(db, user_id=legacy_user_id)

    assert wallet_after == wallet_before + 1
    assert inventory_after == inventory_before
    assert vault_after == vault_before
    assert earn_after == earn_before

    ledger = (
        db.query(UserGameWalletLedger)
        .filter(UserGameWalletLedger.user_id == legacy_user_id, UserGameWalletLedger.token_type == token_type)
        .order_by(UserGameWalletLedger.id.desc())
        .first()
    )
    assert ledger is not None
    assert int(ledger.delta) == -1


def _seed_base_state(db: Session) -> tuple[int, int]:
    for feature in (FeatureType.ROULETTE, FeatureType.DICE, FeatureType.LOTTERY):
        _ensure_feature_config(db, feature)

    v2_user = _seed_v2_user(db)
    legacy_user_id = V2UserService.ensure_legacy_user_id(db, v2_user.id)

    user = db.get(User, legacy_user_id)
    if user is None:
        user = _seed_user(db)
        legacy_user_id = user.id

    _seed_roulette_config(db)
    _seed_dice_config(db)
    _seed_lottery_config(db)
    _grant_game_tickets(db, legacy_user_id)
    db.commit()
    return int(v2_user.id), int(legacy_user_id)


def test_roulette_ledger_separation(client: TestClient, seed_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    _disable_benefit_suspension(monkeypatch)
    v2_user_id, legacy_user_id = _seed_base_state(seed_session)
    _override_auth(v2_user_id)
    try:
        _assert_ledger_separation(
            seed_session,
            client,
            legacy_user_id=legacy_user_id,
            path="/api/v2/roulette/play",
            token_type=GameTokenType.ROULETTE_TICKET,
        )
    finally:
        _clear_auth_override()


def test_dice_ledger_separation(client: TestClient, seed_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    _disable_benefit_suspension(monkeypatch)
    v2_user_id, legacy_user_id = _seed_base_state(seed_session)
    _override_auth(v2_user_id)
    try:
        _assert_ledger_separation(
            seed_session,
            client,
            legacy_user_id=legacy_user_id,
            path="/api/v2/dice/play",
            token_type=GameTokenType.DICE_TICKET,
        )
    finally:
        _clear_auth_override()


def test_lottery_ledger_separation(client: TestClient, seed_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    _disable_benefit_suspension(monkeypatch)
    v2_user_id, legacy_user_id = _seed_base_state(seed_session)
    _override_auth(v2_user_id)
    try:
        _assert_ledger_separation(
            seed_session,
            client,
            legacy_user_id=legacy_user_id,
            path="/api/v2/lottery/play",
            token_type=GameTokenType.LOTTERY_TICKET,
        )
    finally:
        _clear_auth_override()


def test_roulette_ticket_fallback_consumes_legacy_once(
    client: TestClient, seed_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _disable_benefit_suspension(monkeypatch)
    for feature in (FeatureType.ROULETTE,):
        _ensure_feature_config(seed_session, feature)

    v2_user = _seed_v2_user(seed_session)
    legacy_user_id = V2UserService.ensure_legacy_user_id(seed_session, v2_user.id)
    user = seed_session.get(User, legacy_user_id)
    if user is None:
        user = _seed_user(seed_session)
        legacy_user_id = user.id

    _seed_roulette_config(seed_session)
    wallet = GameWalletService()
    wallet.grant_tokens(seed_session, legacy_user_id, GameTokenType.ROULETTE_COIN, 1, reason="TEST")
    seed_session.commit()

    _override_auth(int(v2_user.id))
    try:
        legacy_before = _count_wallet_ledger(seed_session, legacy_user_id, GameTokenType.ROULETTE_COIN)
        standard_before = _count_wallet_ledger(seed_session, legacy_user_id, GameTokenType.ROULETTE_TICKET)
        response = client.post("/api/v2/roulette/play", json={"ticket_type": "ROULETTE_TICKET"})
        assert response.status_code == 200, response.text

        legacy_after = _count_wallet_ledger(seed_session, legacy_user_id, GameTokenType.ROULETTE_COIN)
        standard_after = _count_wallet_ledger(seed_session, legacy_user_id, GameTokenType.ROULETTE_TICKET)

        delta_legacy = legacy_after - legacy_before
        delta_standard = standard_after - standard_before
        assert (delta_legacy + delta_standard) == 1
        assert delta_legacy in {0, 1}
        assert delta_standard in {0, 1}

        latest = (
            seed_session.query(UserGameWalletLedger)
            .filter(UserGameWalletLedger.user_id == legacy_user_id)
            .order_by(UserGameWalletLedger.id.desc())
            .first()
        )
        assert latest is not None
        assert latest.token_type in {GameTokenType.ROULETTE_COIN, GameTokenType.ROULETTE_TICKET}
        assert int(latest.delta) == -1
    finally:
        _clear_auth_override()
