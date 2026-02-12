"""
Test: Admin Vault - aggregate & manual suspension
목표: app/v2/api/admin/vault_routes.py 커버리지 확장

- /vault/aggregate: 집계/중간값 계산
- /vault/users/{id}/suspend-manual: 수동 제재 토글 + 감사로그
"""

from __future__ import annotations

from app.v2.api.admin import vault_routes
from app.v2.models.user import V2User, V2UserRole, V2UserStatus


def _seed_v2_user(db, *, user_id: int, cc_id: str, locked: int, available: int) -> V2User:
    u = V2User(
        id=user_id,
        cc_id=cc_id,
        nickname=cc_id,
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE,
        vault_locked_balance=int(locked),
        vault_available_balance=int(available),
    )
    db.add(u)
    return u


def test_admin_vault_aggregate_computes_totals_and_median(db, base_user):
    # base_user is V2User(id=9001). Ensure it has non-zero balances.
    base_user.vault_locked_balance = 100
    base_user.vault_available_balance = 10
    db.add(base_user)

    _seed_v2_user(db, user_id=9002, cc_id="u9002", locked=200, available=20)
    _seed_v2_user(db, user_id=9003, cc_id="u9003", locked=400, available=30)
    db.commit()

    res = vault_routes.get_vault_aggregate(db=db, admin_info=(1, "ADMIN"))

    assert res.total_users == 3
    assert res.total_locked_balance == 700
    assert res.total_available_balance == 60
    assert res.median_balance == 200
    assert res.max_balance == 400


def test_toggle_manual_suspension_updates_user(db, base_user):
    assert int(base_user.benefits_suspended_manual or 0) == 0

    out = vault_routes.toggle_manual_suspension(
        user_id=base_user.id,
        suspended=True,
        db=db,
        admin_info=(1, "ADMIN"),
    )
    assert out == {"success": True, "suspended": True}

    db.refresh(base_user)
    assert int(base_user.benefits_suspended_manual or 0) == 1
