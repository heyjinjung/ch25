"""
Test: Onboarding (New User)
목표: app/v2/api/new_user_onboarding.py 및 v1_auth_user_alias.py 커버리지 확장

- status: 유저 없음/있음
- claim-welcome: 미션 미구성/성공(미션서비스 스텁)
"""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from app.v2.api import new_user_onboarding
from app.v2.api import v1_auth_user_alias
from app.v2.models import ExternalRankingData, Mission, MissionCategory, MissionRewardType, User, UserActivity
from app.v2.services.mission_service import MissionService
from app.v2.models.user import V2User, V2UserRole, V2UserStatus


def test_new_user_status_user_not_found(db):
    res = new_user_onboarding.status(db=db, user_id=999999)
    assert res.eligible is False
    assert res.reason == "USER_NOT_FOUND"
    assert res.is_new_user_window_active is False
    assert res.deposit_amount == 0
    assert res.total_play_count == 0


def test_v2_new_user_status_alias_returns_eligible_for_existing_user(db, base_user):
    # base_user fixture creates both legacy(User) and V2User with same id
    res = v1_auth_user_alias.v2_new_user_status(db=db, user_id=base_user.id)
    assert res.eligible is True
    assert res.reason in (None, "EXTERNAL_DEPOSIT_HISTORY")
    assert isinstance(res.missions, list)


def test_claim_welcome_missing_mission_config_returns_reason(db, base_user):
    res = v1_auth_user_alias.v2_claim_welcome(db=db, user_id=base_user.id)
    assert res.success is False
    assert res.reason == "WELCOME_MISSION_NOT_CONFIGURED"
    assert res.rewards == []


def test_claim_welcome_success_with_stubbed_reward_claim(db, base_user, monkeypatch):
    # Seed the two welcome missions so the endpoint can proceed.
    m_cash = Mission(
        title="welcome cash",
        description=None,
        category=MissionCategory.NEW_USER,
        logic_key="NEW_USER_WELCOME_CASH",
        action_type="LOGIN",
        target_value=1,
        reward_type=MissionRewardType.CC_POINT,
        reward_amount=1000,
        xp_reward=0,
        requires_approval=False,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    m_ticket = Mission(
        title="welcome ticket",
        description=None,
        category=MissionCategory.NEW_USER,
        logic_key="NEW_USER_WELCOME_TICKET",
        action_type="LOGIN",
        target_value=1,
        reward_type=MissionRewardType.TICKET,
        reward_amount=1,
        xp_reward=0,
        requires_approval=False,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add_all([m_cash, m_ticket])
    db.commit()

    # Keep claim_welcome focused on onboarding flow (avoid deep reward side effects).
    monkeypatch.setattr(MissionService, "get_reset_date_str", lambda self, category: "STATIC")

    def _fake_claim_reward(self, user_id: int, mission_id: int):
        return True, "VAULT", 100

    monkeypatch.setattr(MissionService, "claim_reward", _fake_claim_reward)

    res = new_user_onboarding.claim_welcome(db=db, user_id=base_user.id)
    assert res.success is True
    keys = {r.get("logic_key") for r in res.rewards}
    assert keys == set(new_user_onboarding.WELCOME_AUTO_CLAIM_KEYS)
    assert all(r.get("reward_type") == "VAULT" for r in res.rewards)


def test_new_user_status_window_inactive_and_existing_member_by_external_deposit(db):
    now = datetime.utcnow()

    v1_user = User(
        id=9100,
        external_id="test_v1_user_9100",
        nickname="test_v1_user_9100",
        created_at=now - timedelta(hours=30),
    )
    v2_user = V2User(
        id=9100,
        cc_id="test_v2_user_9100",
        nickname="test_v2_user_9100",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE,
    )
    db.add_all([v1_user, v2_user])

    # external deposit history -> existing_member_by_external_deposit=True
    db.add(
        ExternalRankingData(
            user_id=9100,
            deposit_amount=100,
            play_count=0,
        )
    )

    # activity exists but no charge history
    db.add(
        UserActivity(
            user_id=9100,
            roulette_plays=1,
            dice_plays=2,
            lottery_plays=3,
            last_charge_at=None,
        )
    )
    db.commit()

    res = new_user_onboarding.status(db=db, user_id=9100)
    assert res.eligible is True
    assert res.is_new_user_window_active is False
    assert res.seconds_left == 0
    assert res.existing_member_by_external_deposit is True
    assert res.deposit_amount == 100
    assert res.total_play_count == 6
