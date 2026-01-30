import os
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


from app.api.deps import (
    get_db, 
    get_current_admin_info, 
    get_current_user_id as get_v1_user_id,
    get_current_admin_id
)
from app.main import app as fastapi_app
from app.models.game_wallet import GameTokenType
from app.models.game_wallet_ledger import UserGameWalletLedger
from app.models.game_wallet import UserGameWallet
from app.models.inventory import UserInventoryItem
from app.models.level_xp import UserLevelProgress, UserLevelRewardLog, UserXpEventLog
from app.models.user import User
from app.models.vault_ledger import VaultLedger
from app.v2.api.deps import get_current_user_id as get_v2_user_id
from app.v2.models.v2_admin_message import V2AdminMessage, V2AdminMessageInbox
from app.v2.models.v2_level_reward import V2LevelRewardTable
from app.v2.models.v2_ticket_zero_log import V2TicketZeroLog
from app.v2.services.user_service import V2UserService

from tests.v2_tests.phase3_game.test_game_engine_smoke import (
    _ensure_feature_config,
    _seed_dice_config,
    _seed_lottery_config,
    _seed_roulette_config,
    _seed_user,
    _seed_v2_user,
    _grant_game_tickets,
)
from app.models.feature import FeatureType


def _override_settings():
    from app.core import config as app_core_config

    class MockSettings:
        env = "local"
        test_mode = True
        timezone = "Asia/Seoul"
        streak_day_reset_hour_kst = 9
        golden_hour_enabled = True
        dice_bet_value = 1000
        enable_vault_game_earn_events = True
        vault_accrual_multiplier_enabled = False
        ch25_intervention_enabled = False
        ch25_dda_enabled = False
        ch25_internal_stream_enabled = False
        external_ranking_deposit_step_amount = 100000
        external_ranking_deposit_xp_per_step = 20
        external_ranking_deposit_max_steps_per_day = 50
        external_ranking_deposit_cooldown_minutes = 0

    app_core_config.get_settings = lambda: MockSettings()


def _disable_benefit_suspension(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.services import vault_service

    def _no_suspend(*args, **kwargs):
        return {
            "status": "ACTIVE",
            "recency_multiplier": 1.0,
            "benefits_suspended": False,
            "vault_max_limit": 0,
        }

    monkeypatch.setattr(vault_service.VaultService, "get_user_vault_policy", staticmethod(_no_suspend), raising=False)


def _setup_db() -> Session:
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
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    return SessionLocal()


def _seed_level_rewards(db: Session) -> None:
    rows = [
        V2LevelRewardTable(
            level=1,
            required_xp=0,
            reward_type="NONE",
            reward_amount=0,
            reward_payload={},
        ),
        V2LevelRewardTable(
            level=2,
            required_xp=20,
            reward_type="TICKET_ROULETTE",
            reward_amount=1,
            reward_payload={"tickets": 1},
        ),
    ]
    db.add_all(rows)
    db.flush()


def test_verify_full_scenario_v2(monkeypatch: pytest.MonkeyPatch) -> None:
    _override_settings()
    _disable_benefit_suspension(monkeypatch)

    db = _setup_db()

    def _override_get_db():
        yield db

    fastapi_app.dependency_overrides[get_db] = _override_get_db

    with TestClient(fastapi_app) as client:
        # Seed base configs
        for feature in (FeatureType.ROULETTE, FeatureType.DICE, FeatureType.LOTTERY):
            _ensure_feature_config(db, feature)

        v2_user = _seed_v2_user(db)
        legacy_user_id = V2UserService.ensure_legacy_user_id(db, v2_user.id)

        user = db.get(User, legacy_user_id)
        if user is None:
            user = _seed_user(db)
        user.external_id = v2_user.cc_id
        user.nickname = "E2E User"
        db.add(user)

        admin = User(external_id="admin_e2e", nickname="E2E Admin", status="ACTIVE")
        db.add(admin)

        _seed_roulette_config(db)
        dice_config = _seed_dice_config(db)
        lottery_config = _seed_lottery_config(db)
        _grant_game_tickets(db, legacy_user_id)
        _seed_level_rewards(db)

        # Make game rewards deterministic and vault-positive
        from app.v2.models.v2_roulette import V2RouletteSegment
        for seg in db.query(V2RouletteSegment).all():
            seg.reward_type = "POINT"
            seg.reward_amount = 100

        dice_config.win_probability = 1.0
        dice_config.draw_probability = 0.0
        dice_config.lose_probability = 0.0
        dice_config.win_reward_type = "POINT"
        dice_config.win_reward_amount = 200

        for prize in lottery_config.prizes:
            prize.reward_type = "POINT"
            prize.reward_amount = 150

        db.commit()

        fastapi_app.dependency_overrides[get_v1_user_id] = lambda: int(v2_user.id)
        fastapi_app.dependency_overrides[get_v2_user_id] = lambda: int(v2_user.id)
        fastapi_app.dependency_overrides[get_current_admin_id] = lambda: int(v2_user.id)

        print("\n========== Phase5 Scenario 1: New User Journey ==========")
        r_roulette = client.post("/api/v2/roulette/play")
        print("Roulette Response:", r_roulette.status_code, r_roulette.json())
        assert r_roulette.status_code == 200

        r_dice = client.post("/api/v2/dice/play", json={"bet_amount": 1, "prediction": "EVEN"})
        print("Dice Response:", r_dice.status_code, r_dice.json())
        assert r_dice.status_code == 200

        r_lottery = client.post("/api/v2/lottery/play")
        print("Lottery Response:", r_lottery.status_code, r_lottery.json())
        assert r_lottery.status_code == 200

        r_vault = client.get("/api/v2/vault/status")
        print("Vault Status:", r_vault.status_code, r_vault.json())
        assert r_vault.status_code == 200

        r_deposit = client.post(
            "/admin/api/external-ranking/",
            json=[{
                "cc_id": v2_user.cc_id,
                "deposit_amount": 100000,
                "play_count": 1,
                "memo": "E2E_CC_DEPOSIT"
            }]
        )
        print("CC Deposit Response:", r_deposit.status_code, r_deposit.json())
        assert r_deposit.status_code == 200

        progress = db.query(UserLevelProgress).filter(UserLevelProgress.user_id == legacy_user_id).first()
        reward_log = db.query(UserLevelRewardLog).filter(
            UserLevelRewardLog.user_id == legacy_user_id,
            UserLevelRewardLog.level == 2,
        ).first()
        xp_log = db.query(UserXpEventLog).filter(UserXpEventLog.user_id == legacy_user_id).first()
        print("Level Progress:", progress.level if progress else None, progress.xp if progress else None)
        print("Level Reward Log:", reward_log.level if reward_log else None, reward_log.reward_type if reward_log else None)
        print("XP Event Log:", xp_log.source if xp_log else None, xp_log.delta if xp_log else None)
        assert progress is not None
        assert progress.level >= 2
        assert reward_log is not None
        assert reward_log.reward_type == "ROULETTE_TICKET"  # normalized enum

        print("\n========== Phase5 Scenario 2: Gambler's Loop ==========")
        user.vault_locked_balance = 0
        db.query(UserGameWallet).filter(UserGameWallet.user_id == legacy_user_id).delete()
        db.query(UserInventoryItem).filter(UserInventoryItem.user_id == legacy_user_id).delete()
        db.query(V2AdminMessageInbox).filter(V2AdminMessageInbox.user_id == v2_user.id).delete()
        db.commit()

        r_tz_status = client.get("/api/v2/ticket-zero/status")
        print("TicketZero Status:", r_tz_status.status_code, r_tz_status.json())
        assert r_tz_status.status_code == 200
        assert r_tz_status.json().get("bailout_available") is True

        r_tz = client.post("/api/v2/ticket-zero/bailout")
        print("TicketZero Bailout:", r_tz.status_code, r_tz.json())
        assert r_tz.status_code == 200
        assert r_tz.json().get("granted") is True

        tz_log = db.query(V2TicketZeroLog).filter(V2TicketZeroLog.user_id == legacy_user_id).first()
        tz_wallet = db.query(UserGameWallet).filter(
            UserGameWallet.user_id == legacy_user_id,
            UserGameWallet.token_type == GameTokenType.ROULETTE_COIN,
        ).first()
        print("TicketZero Log:", tz_log.ticket_type if tz_log else None, tz_log.ticket_amount if tz_log else None)
        print("TicketZero Wallet:", tz_wallet.token_type if tz_wallet else None, tz_wallet.balance if tz_wallet else None)
        assert tz_log is not None
        assert tz_wallet is not None

        r_roulette2 = client.post("/api/v2/roulette/play")
        print("Roulette After Bailout:", r_roulette2.status_code, r_roulette2.json())
        assert r_roulette2.status_code == 200

        print("\n========== Phase5 Scenario 3: Admin Intervention ==========")
        fastapi_app.dependency_overrides[get_current_admin_info] = lambda: (admin.id, "ADMIN")

        r_force = client.post(
            "/api/v2/admin/vault/force-edit",
            json={"user_id": legacy_user_id, "amount": 5000, "reason": "E2E_ADMIN_FIX"}
        )
        print("Admin Force Edit:", r_force.status_code, r_force.json())
        assert r_force.status_code == 200

        r_msg = client.post(
            "/api/v2/messages",
            json={
                "title": "E2E 보상",
                "content": "테스트 보상 메시지",
                "target_type": "USER",
                "target_value": str(v2_user.id),
                "channels": ["INBOX"],
            },
        )
        print("Admin Message:", r_msg.status_code, r_msg.json())
        assert r_msg.status_code == 200

        fastapi_app.dependency_overrides[get_v1_user_id] = lambda: int(v2_user.id)
        fastapi_app.dependency_overrides[get_v2_user_id] = lambda: int(v2_user.id)
        fastapi_app.dependency_overrides[get_current_admin_id] = lambda: int(admin.id)
        r_inbox = client.get("/api/v2/inbox")
        print("Inbox:", r_inbox.status_code, r_inbox.json())
        assert r_inbox.status_code == 200
        inbox_items = r_inbox.json().get("messages", [])
        assert len(inbox_items) >= 1

        inbox_id = inbox_items[0]["id"]
        r_read = client.patch("/api/v2/inbox/read", json={"inbox_ids": [inbox_id]})
        print("Inbox Read:", r_read.status_code, r_read.json())
        assert r_read.status_code == 200

        vault_ledger = db.query(VaultLedger).filter(VaultLedger.user_id == legacy_user_id).order_by(VaultLedger.id.desc()).first()
        message = db.query(V2AdminMessage).order_by(V2AdminMessage.id.desc()).first()
        inbox_row = db.query(V2AdminMessageInbox).order_by(V2AdminMessageInbox.id.desc()).first()
        wallet_ledger = db.query(UserGameWalletLedger).filter(UserGameWalletLedger.user_id == legacy_user_id).order_by(UserGameWalletLedger.id.desc()).first()

        print("Vault Ledger:", vault_ledger.amount if vault_ledger else None, vault_ledger.ref_type if vault_ledger else None)
        print("Admin Message Row:", message.id if message else None, message.title if message else None)
        print("Inbox Row:", inbox_row.user_id if inbox_row else None, inbox_row.is_read if inbox_row else None)
        print("Wallet Ledger (latest):", wallet_ledger.token_type if wallet_ledger else None, wallet_ledger.delta if wallet_ledger else None)

        assert vault_ledger is not None
        assert message is not None
        assert inbox_row is not None

    fastapi_app.dependency_overrides.clear()
    db.close()
