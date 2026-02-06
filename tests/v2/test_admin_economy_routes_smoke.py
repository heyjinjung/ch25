import pytest
from fastapi import HTTPException

from app.v2.api.admin import economy_routes
from app.v2.models.core.user import User as LegacyUser
from app.v2.models.user import V2User
from app.v2.schemas.v2_admin_economy import AdminDepositCreateRequest, AdminDepositUpdateRequest


def _seed_legacy_and_v2_user(db, *, user_id: int) -> None:
    legacy = LegacyUser(
        id=user_id,
        external_id=f"ext_{user_id}",
        nickname=f"legacy_{user_id}",
        vault_balance=0,
        vault_locked_balance=0,
        vault_available_balance=0,
    )
    v2 = V2User(
        id=user_id,
        cc_id=f"cc_{user_id}",
        nickname=f"v2_{user_id}",
        level=1,
        xp=0,
        vault_locked_balance=0,
        vault_available_balance=0,
        status="ACTIVE",
        role="USER",
    )
    db.add_all([legacy, v2])
    db.commit()


def test_admin_economy_transaction_types_smoke():
    rows = economy_routes.get_wallet_transaction_types(admin_info=(1, "ADMIN"))
    assert isinstance(rows, list)
    assert any(r.get("value") == "VAULT" for r in rows)


def test_admin_economy_deposit_log_crud_and_pending(db):
    user_id = 101
    _seed_legacy_and_v2_user(db, user_id=user_id)

    admin_info = (999, "ADMIN")

    created = economy_routes.create_deposit_log(
        AdminDepositCreateRequest(user_id=user_id, amount=5000, kst_date="2026-02-01"),
        db=db,
        admin_info=admin_info,
    )
    assert created.userId == user_id
    assert created.amount == 5000

    logs = economy_routes.list_deposit_logs(
        search=None,
        page=1,
        limit=50,
        db=db,
        admin_info=admin_info,
    )
    assert any(l.userId == user_id for l in logs)

    updated = economy_routes.update_deposit_log(
        created.id,
        AdminDepositUpdateRequest(amount=7000, kst_date=None),
        db=db,
        admin_info=admin_info,
    )
    assert updated.id == created.id
    assert updated.amount == 7000

    pending = economy_routes.list_pending_deposits(db=db, admin_info=admin_info)
    assert any(p.user_id == user_id for p in pending)

    deleted = economy_routes.delete_deposit_log(created.id, db=db, admin_info=admin_info)
    assert deleted == {"success": True}

    with pytest.raises(HTTPException) as exc:
        economy_routes.update_deposit_log(
            999999,
            AdminDepositUpdateRequest(amount=1, kst_date=None),
            db=db,
            admin_info=admin_info,
        )
    assert exc.value.status_code == 404
