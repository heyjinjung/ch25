from __future__ import annotations

from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_admin_id, get_current_admin_info, get_db
from app.db.base_class import Base
from app.main import app
from app.v2.models.v2_dice import V2DiceConfig as DiceConfig
from app.v2.models.v2_lottery import V2LotteryConfig as LotteryConfig, V2LotteryPrize as LotteryPrize
from app.v2.models.v2_roulette import V2RouletteConfig as RouletteConfig, V2RouletteSegment as RouletteSegment
from app.models.user import User


@pytest.fixture()
def test_engine():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    import app.db.base  # noqa: F401
    import app.v2.models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture()
def db_session(test_engine) -> Session:
    SessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _seed_admin(db: Session) -> None:
    if db.get(User, 1) is None:
        db.add(User(id=1, external_id="admin-1", nickname="Admin", created_at=datetime.utcnow(), updated_at=datetime.utcnow()))
    db.commit()


def _seed_game_configs(db: Session) -> None:
    if db.query(RouletteConfig).count() == 0:
        cfg = RouletteConfig(
            id=1,
            name="R1",
            grade="NEW",
            ticket_type="ROULETTE_COIN",
            max_daily_spins=3,
            is_active=True,
        )
        db.add(cfg)
        db.flush()
        for idx in range(6):
            db.add(
                RouletteSegment(
                    config_id=cfg.id,
                    slot_index=idx,
                    label=f"S{idx}",
                    weight=1,
                    reward_type="TICKET_ROULETTE",
                    reward_amount=1,
                    is_jackpot=(idx == 0),
                )
            )

    if db.query(DiceConfig).count() == 0:
        db.add(
            DiceConfig(
                id=1,
                name="D1",
                is_active=True,
                max_daily_plays=10,
                win_probability=0.4,
                draw_probability=0.1,
                lose_probability=0.5,
                win_reward_type="POINT",
                win_reward_amount=200,
                draw_reward_type="NONE",
                draw_reward_amount=0,
                lose_reward_type="POINT",
                lose_reward_amount=-50,
                daily_gain_cap=20000,
            )
        )

    if db.query(LotteryConfig).count() == 0:
        cfg = LotteryConfig(id=1, name="L1", is_active=True, max_daily_tickets=5)
        db.add(cfg)
        db.flush()
        db.add(
            LotteryPrize(
                config_id=cfg.id,
                label="P1",
                weight=1,
                stock=None,
                reward_type="POINT",
                reward_amount=100,
                is_active=True,
            )
        )

    db.commit()


@pytest.fixture()
def client(db_session: Session) -> TestClient:
    _seed_admin(db_session)
    _seed_game_configs(db_session)

    def override_get_db():
        yield db_session

    def override_get_current_admin_id():
        return 1

    def override_get_current_admin_info():
        return (1, "SUPER_ADMIN")

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_admin_id] = override_get_current_admin_id
    app.dependency_overrides[get_current_admin_info] = override_get_current_admin_info

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


def test_admin_roulette_config_get_and_update(client: TestClient) -> None:
    resp = client.get("/api/v2/admin/game/roulette/configs")
    assert resp.status_code == 200, resp.text
    configs = resp.json()
    assert isinstance(configs, list)
    assert len(configs) >= 1

    cfg_id = configs[0]["id"]

    resp = client.get(f"/api/v2/admin/game/roulette/config/{cfg_id}")
    assert resp.status_code == 200, resp.text
    cfg = resp.json()
    assert cfg["id"] == cfg_id
    assert len(cfg.get("segments") or []) == 6

    payload = {
        "name": "R1-updated",
        "ticket_type": "ROULETTE_COIN",
        "max_daily_spins": 5,
        "is_active": True,
        "segments": [
            {
                "slot_index": i,
                "label": f"S{i}",
                "weight": 2,
                "reward_type": "TICKET",
                "reward_amount": 1,
                "is_jackpot": i == 0,
            }
            for i in range(6)
        ],
    }

    resp = client.put(f"/api/v2/admin/game/roulette/config/{cfg_id}", json=payload)
    assert resp.status_code == 200, resp.text


def test_admin_dice_config_get_and_update(client: TestClient) -> None:
    resp = client.get("/api/v2/admin/game/dice/config")
    assert resp.status_code == 200, resp.text
    cfg = resp.json()

    payload = {
        "name": "D1-updated",
        "is_active": True,
        "max_daily_plays": 12,
        "win_probability": 0.35,
        "draw_probability": 0.1,
        "lose_probability": 0.55,
        "win_reward_type": "POINT",
        "win_reward_amount": 200,
        "draw_reward_type": "NONE",
        "draw_reward_amount": 0,
        "lose_reward_type": "POINT",
        "lose_reward_amount": -50,
        "daily_gain_cap": 20000,
    }

    resp = client.put(f"/api/v2/admin/game/dice/config/{cfg['id']}", json=payload)
    assert resp.status_code == 200, resp.text


def test_admin_lottery_config_and_prize_crud(client: TestClient) -> None:
    resp = client.get("/api/v2/admin/game/lottery/configs")
    assert resp.status_code == 200, resp.text
    configs = resp.json()
    assert len(configs) >= 1

    cfg_id = configs[0]["id"]

    resp = client.get(f"/api/v2/admin/game/lottery/config/{cfg_id}")
    assert resp.status_code == 200, resp.text

    resp = client.put(
        f"/api/v2/admin/game/lottery/config/{cfg_id}",
        json={"name": "L1-updated", "is_active": True, "max_daily_plays": 10, "puzzle_piece_probability": 0.0},
    )
    assert resp.status_code == 200, resp.text

    # Update existing prize
    cfg = resp.json()
    prize_id = cfg["prizes"][0]["id"]

    resp = client.put(
        f"/api/v2/admin/game/lottery/config/{cfg_id}/prize/{prize_id}",
        json={
            "label": "P1",
            "weight": 2,
            "stock": None,
            "reward_type": "POINT",
            "reward_amount": 100,
            "is_active": True,
        },
    )
    assert resp.status_code == 200, resp.text

    # Create a new prize
    resp = client.post(
        f"/api/v2/admin/game/lottery/config/{cfg_id}/prize",
        json={
            "label": "P2",
            "weight": 1,
            "stock": None,
            "reward_type": "POINT",
            "reward_amount": 50,
            "is_active": True,
        },
    )
    assert resp.status_code == 200, resp.text
    new_prize_id = resp.json()["id"]

    # Delete the new prize
    resp = client.delete(f"/api/v2/admin/game/lottery/config/{cfg_id}/prize/{new_prize_id}")
    assert resp.status_code == 200, resp.text
