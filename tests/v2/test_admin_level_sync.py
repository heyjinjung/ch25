"""Admin level/XP sync tests (V2 SoT: v2_user).

도메인: 레벨/XP, 어드민 조정
관련 SoT: docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/level/20260204_v2_sot_consolidation.md
"""

from app.v2.api.admin.user_routes import (
    adjust_admin_user_level_xp,
    get_admin_user_level_by_cc_id,
    set_admin_user_level,
)
from app.v2.models import User, UserLevelProgress
from app.v2.models.user import V2User
from app.v2.models.v2_level_reward import V2LevelRewardTable
from app.v2.schemas.v2_admin_user import AdminUserLevelAdjustRequest, AdminUserLevelSetRequest


def _seed_level_table(db):
    levels = [
        V2LevelRewardTable(level=1, required_xp=0, reward_type="NONE", reward_amount=0),
        V2LevelRewardTable(level=2, required_xp=100, reward_type="NONE", reward_amount=0),
        V2LevelRewardTable(level=3, required_xp=200, reward_type="NONE", reward_amount=0),
    ]
    db.add_all(levels)
    db.commit()


def _seed_user(db, user_id: int, cc_id: str):
    legacy_user = User(id=user_id, external_id=cc_id, nickname=cc_id)
    v2_user = V2User(id=user_id, cc_id=cc_id, nickname=cc_id, level=1, xp=0)
    db.add_all([legacy_user, v2_user])
    db.commit()
    return v2_user


def test_admin_adjust_updates_v2_user_and_progress(db):
    _seed_level_table(db)
    _seed_user(db, user_id=1, cc_id="cc1")

    payload = AdminUserLevelAdjustRequest(ccId="cc1", deltaXp=150, reason="test")
    result = adjust_admin_user_level_xp(payload, db=db, admin_info=(1, "SUPER_ADMIN"))

    user = db.get(V2User, 1)
    legacy_user = db.get(User, 1)
    progress = db.get(UserLevelProgress, 1)

    assert user is not None
    assert legacy_user is not None
    assert progress is not None
    assert user.xp == 150
    assert user.level == 2
    assert progress.xp == 150
    assert progress.level == 2
    assert result.xp == 150
    assert result.level == 2


def test_admin_set_updates_v2_user_and_progress(db):
    _seed_level_table(db)
    _seed_user(db, user_id=2, cc_id="cc2")

    payload = AdminUserLevelSetRequest(ccId="cc2", level=3, xp=250, reason="test")
    result = set_admin_user_level(payload, db=db, admin_info=(1, "SUPER_ADMIN"))

    snapshot = get_admin_user_level_by_cc_id("cc2", db=db, admin_info=(1, "SUPER_ADMIN"))
    user = db.get(V2User, 2)
    progress = db.get(UserLevelProgress, 2)

    assert user is not None
    assert progress is not None
    assert user.xp == 250
    assert user.level == 3
    assert progress.xp == 250
    assert progress.level == 3
    assert result.xp == 250
    assert result.level == 3
    assert snapshot.xp == 250
    assert snapshot.level == 3
