"""
Test: Admin Vault - aggregate & manual suspension
목표: app/v2/api/admin/vault_routes.py 커버리지 확장

- /vault/aggregate: 집계/중간값 계산
- /vault/users/{id}/suspend-manual: 수동 제재 토글 + 감사로그
"""

from __future__ import annotations

from datetime import date

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


def test_vault_spend_limits_filters_and_flags(db):
    today = date.today().isoformat()

    u1 = _seed_v2_user(db, user_id=9201, cc_id="u9201", locked=0, available=0)
    u1.vault_spent_today = 40000
    u1.vault_spent_reset_date = today

    u2 = _seed_v2_user(db, user_id=9202, cc_id="u9202", locked=0, available=0)
    u2.vault_spent_today = 50000
    u2.vault_spent_reset_date = today

    u3 = _seed_v2_user(db, user_id=9203, cc_id="u9203", locked=0, available=0)
    u3.vault_spent_today = 0
    u3.vault_spent_reset_date = today

    db.commit()

    res = vault_routes.get_vault_spend_limits(min_usage_rate=0.81, limit=50, db=db, admin_info=(1, "ADMIN"))
    assert [r.user_id for r in res] == [9202]
    assert res[0].is_limit_reached is True

    res2 = vault_routes.get_vault_spend_limits(min_usage_rate=0.8, limit=50, db=db, admin_info=(1, "ADMIN"))
    ids = {r.user_id for r in res2}
    assert ids == {9201, 9202}


def test_vault_spend_limits_summary_counts(db):
    today = date.today().isoformat()

    u1 = _seed_v2_user(db, user_id=9301, cc_id="u9301", locked=0, available=0)
    u1.vault_spent_today = 40000
    u1.vault_spent_reset_date = today

    u2 = _seed_v2_user(db, user_id=9302, cc_id="u9302", locked=0, available=0)
    u2.vault_spent_today = 50000
    u2.vault_spent_reset_date = today

    db.commit()

    out = vault_routes.get_vault_spend_limits_summary(db=db, admin_info=(1, "ADMIN"))
    assert out.total_users == 2
    assert out.users_at_limit == 1
    assert out.users_above_80_percent == 2
    assert out.total_daily_spent == 90000
