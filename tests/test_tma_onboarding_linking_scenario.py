"""Integrated scenario tests for Phase 0 (TMA onboarding + account linking).

Scope (implemented today):
- Telegram Mini App auth entry: POST /api/telegram/auth
- Existing account linking via start_param: POST /api/telegram/link-token + start_param=link_...
- New-user eligibility gating based on external ranking deposit history: GET /api/new-user/status

Design reference:
- docs/design/2026!!daily_mission_system_ko_v5.md
- docs/02_architecture/telegram_account_linking_v1_ko.md
"""

from __future__ import annotations

import json
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

import pytest
from fastapi import Depends
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from starlette import status

from app.api.deps import bearer_scheme, get_current_admin_id, get_current_user_id, get_db
from app.core import telegram as telegram_core
from app.core.security import decode_access_token
from app.main import app
from app.models.external_ranking import ExternalRankingData
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.mission import Mission, MissionCategory, MissionRewardType
from app.models.user import User


def _build_init_data(*, tg_id: int, username: str, start_param: str | None = None) -> str:
    # Telegram initData is a querystring; our validator only requires a `hash` field and `user` json.
    user_json = json.dumps({"id": tg_id, "username": username}, separators=(",", ":"))
    parts = [
        "query_id=AAE_TEST_QUERY_ID",
        f"user={quote(user_json)}",
        "auth_date=1700000000",
    ]
    if start_param:
        parts.append(f"start_param={quote(start_param)}")
    parts.append("hash=deadbeef")
    return "&".join(parts)


def _ensure_telegram_validation_enabled() -> None:
    # app/core/telegram.py caches settings at import time (module global `settings`),
    # so patch the cached settings instance directly.
    telegram_core.settings.telegram_bot_token = telegram_core.settings.telegram_bot_token or "test-bot-token"


@contextmanager
def _use_bearer_auth_overrides():
    """Override test defaults (user_id=1) with real Bearer parsing for integrated flows."""

    prev_user = app.dependency_overrides.get(get_current_user_id)
    prev_admin = app.dependency_overrides.get(get_current_admin_id)

    def _auth_override(
        db: Session = Depends(get_db),
        credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    ) -> int:
        if credentials is None or not credentials.credentials:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="AUTH_REQUIRED")

        payload = decode_access_token(credentials.credentials)
        sub = payload.get("sub")
        try:
            user_id = int(sub)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="TOKEN_INVALID") from exc

        exists = db.query(User.id).filter(User.id == user_id).first()
        if not exists:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="TOKEN_INVALID")
        return user_id

    app.dependency_overrides[get_current_user_id] = _auth_override
    app.dependency_overrides[get_current_admin_id] = _auth_override
    try:
        yield
    finally:
        if prev_user is None:
            app.dependency_overrides.pop(get_current_user_id, None)
        else:
            app.dependency_overrides[get_current_user_id] = prev_user
        if prev_admin is None:
            app.dependency_overrides.pop(get_current_admin_id, None)
        else:
            app.dependency_overrides[get_current_admin_id] = prev_admin


def _get_wallet_balance(db: Session, *, user_id: int, token_type: GameTokenType) -> int:
    wallet = (
        db.query(UserGameWallet)
        .filter(UserGameWallet.user_id == user_id, UserGameWallet.token_type == token_type)
        .one_or_none()
    )
    return int(wallet.balance) if wallet else 0


def test_link_token_flow_attaches_existing_user_and_preserves_identity(client: TestClient, session_factory) -> None:
    _ensure_telegram_validation_enabled()
    with _use_bearer_auth_overrides():

        db = session_factory()
        existing = User(external_id="ext-1", nickname="Existing User", created_at=datetime.utcnow())
        db.add(existing)
        db.commit()
        db.refresh(existing)

        db.add(ExternalRankingData(user_id=existing.id, deposit_amount=50_000, play_count=10))
        db.commit()

        # 1) Existing user logs in (external_id/password)
        token_resp = client.post("/api/auth/token", json={"external_id": "ext-1", "password": "pw1"})
        assert token_resp.status_code == 200
        access_token = token_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        # 2) Issue one-time start_param for Telegram linking
        link_resp = client.post("/api/telegram/link-token", headers=headers)
        assert link_resp.status_code == 200
        link_body = link_resp.json()
        start_param = link_body["start_param"]
        assert isinstance(start_param, str) and start_param.startswith("link_")

        # 3) Telegram auth with start_param links Telegram to the EXISTING user (no new user created)
        init_data = _build_init_data(tg_id=111_222_333, username="tg_existing", start_param=start_param)
        tg_auth = client.post("/api/telegram/auth", json={"init_data": init_data, "start_param": start_param})
        assert tg_auth.status_code == 200
        tg_body = tg_auth.json()
        assert tg_body["linked_to_existing"] is True
        assert tg_body["is_new_user"] is False
        assert tg_body["user"]["id"] == existing.id
        assert tg_body["user"]["external_id"] == "ext-1"

        # DB asserts: telegram_id attached and link nonce cleared
        db2 = session_factory()
        refreshed = db2.query(User).filter(User.id == existing.id).one()
        assert int(refreshed.telegram_id) == 111_222_333
        assert refreshed.telegram_link_nonce is None
        assert refreshed.telegram_link_nonce_expires_at is None

        # 4) New-user status must be NOT eligible for users with external deposit history
        status_resp = client.get("/api/new-user/status", headers={"Authorization": f"Bearer {tg_body['access_token']}"})
        assert status_resp.status_code == 200
        status_body = status_resp.json()
        assert status_body["telegram_linked"] is True
        assert status_body["existing_member_by_external_deposit"] is True
        assert status_body["eligible"] is False
        assert status_body["reason"] == "EXTERNAL_DEPOSIT_HISTORY"

        # 5) Token cannot be used to bind a DIFFERENT Telegram account after linkage.
        # (Once the user has a telegram_id, the server blocks linking a different tg_id.)
        hijack_init = _build_init_data(tg_id=444_555_666, username="tg_attacker", start_param=start_param)
        hijack = client.post("/api/telegram/auth", json={"init_data": hijack_init, "start_param": start_param})
        assert hijack.status_code == 410
        assert hijack.json()["error"]["code"] == "LINK_CODE_ALREADY_USED"

        # 6) Once linked, link-token issuance should be blocked.
        link_again = client.post("/api/telegram/link-token", headers=headers)
        assert link_again.status_code == 409
        assert link_again.json()["error"]["code"] == "TELEGRAM_ALREADY_LINKED"

        # 7) Mission: daily-gift claim must work (immediate reward path)
        db3 = session_factory()
        before = _get_wallet_balance(db3, user_id=existing.id, token_type=GameTokenType.DIAMOND)

        gift = client.post("/api/mission/daily-gift", headers={"Authorization": f"Bearer {tg_body['access_token']}"})
        assert gift.status_code == 200
        gift_body = gift.json()
        assert gift_body["success"] is True
        assert gift_body["reward_type"] == "DIAMOND"
        assert int(gift_body["amount"]) > 0

        db4 = session_factory()
        after = _get_wallet_balance(db4, user_id=existing.id, token_type=GameTokenType.DIAMOND)
        assert after >= before + int(gift_body["amount"])


def test_new_user_without_external_deposit_is_eligible_for_welcome(client: TestClient, session_factory) -> None:
    _ensure_telegram_validation_enabled()
    with _use_bearer_auth_overrides():

        # 1) Telegram auth without link token creates a new user
        init_data = _build_init_data(tg_id=999_888_777, username="tg_new_user")
        tg_auth = client.post("/api/telegram/auth", json={"init_data": init_data})
        assert tg_auth.status_code == 200
        body = tg_auth.json()
        assert body["is_new_user"] is True
        assert body.get("linked_to_existing") in (False, None)
        new_user_id = int(body["user"]["id"])

        # 2) Status endpoint should be eligible (no external deposit yet)
        status_resp = client.get("/api/new-user/status", headers={"Authorization": f"Bearer {body['access_token']}"})
        assert status_resp.status_code == 200
        status_body = status_resp.json()
        assert status_body["telegram_linked"] is True
        assert status_body["existing_member_by_external_deposit"] is False
        assert status_body["eligible"] is True
        assert status_body["reason"] is None

        # 3) Mission: viral story action should update progress and allow reward claim.
        db = session_factory()
        mission = Mission(
            title="Share Story (Test)",
            description="Test mission triggered by SHARE_STORY action",
            category=MissionCategory.SPECIAL,
            logic_key="share_story_1_test",
            action_type="SHARE_STORY",
            target_value=1,
            reward_type=MissionRewardType.DIAMOND,
            reward_amount=123,
            is_active=True,
        )
        db.add(mission)
        db.commit()
        db.refresh(mission)

        before = _get_wallet_balance(db, user_id=new_user_id, token_type=GameTokenType.DIAMOND)

        action = client.post(
            "/api/viral/action/story",
            json={"action_type": "SHARE_STORY"},
            headers={"Authorization": f"Bearer {body['access_token']}"},
        )
        assert action.status_code == 200
        assert int(action.json().get("updated_count") or 0) >= 1

        claim = client.post(
            f"/api/mission/{mission.id}/claim",
            headers={"Authorization": f"Bearer {body['access_token']}"},
        )
        assert claim.status_code == 200
        claim_body = claim.json()
        assert claim_body["success"] is True
        assert claim_body["reward_type"] == "DIAMOND"
        assert int(claim_body["amount"]) == 123

        db2 = session_factory()
        after = _get_wallet_balance(db2, user_id=new_user_id, token_type=GameTokenType.DIAMOND)
        assert after >= before + 123


def test_link_token_is_not_accepted_as_access_token(client: TestClient, session_factory) -> None:
    _ensure_telegram_validation_enabled()
    with _use_bearer_auth_overrides():

        db = session_factory()
        user = User(external_id="ext-2", nickname="User2", created_at=datetime.utcnow())
        db.add(user)
        db.commit()
        db.refresh(user)

        token_resp = client.post("/api/auth/token", json={"external_id": "ext-2", "password": "pw2"})
        assert token_resp.status_code == 200
        access_token = token_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        link_resp = client.post("/api/telegram/link-token", headers=headers)
        assert link_resp.status_code == 200
        start_param = link_resp.json()["start_param"]
        raw_link_token = start_param[len("link_") :]

        with pytest.raises(HTTPException) as exc_info:
            decode_access_token(raw_link_token)
        assert exc_info.value.detail == "TOKEN_INVALID"


def test_frontend_sound_and_build_optimization_smoke() -> None:
    """Static smoke checks for sound + build/image optimization wiring."""

    root = Path(__file__).resolve().parents[1]

    package_json = json.loads((root / "package.json").read_text(encoding="utf-8"))
    deps = package_json.get("dependencies", {})
    dev_deps = package_json.get("devDependencies", {})

    assert "howler" in deps, "sound system should include howler dependency"
    assert "vite-plugin-compression2" in dev_deps, "build optimization should include compression plugin"

    vite_config = (root / "vite.config.ts").read_text(encoding="utf-8")
    assert "vite-plugin-compression2" in vite_config
    assert "compression(" in vite_config

    # Image optimization script (ops-side) should exist.
    assert (root / "scripts" / "convert_to_webp.py").exists()

    # If a build has been produced, ensure brotli/gzip artifacts exist (non-blocking for CI).
    dist = root / "dist"
    if dist.exists():
        br_files = list(dist.rglob("*.br"))
        gz_files = list(dist.rglob("*.gz"))
        assert br_files or gz_files
