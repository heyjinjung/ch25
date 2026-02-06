import pytest
from fastapi import HTTPException

from app.v2.api.admin import user_routes
from app.v2.models.user import V2User
from app.v2.models.v2_user_segment import V2UserSegment
from app.v2.schemas.v2_admin_user import AdminUserCreate, AdminNicknameUpdateRequest


def _seed_v2_user(db, *, user_id: int, cc_id: str, nickname: str, telegram_id: int | None = None) -> V2User:
    user = V2User(
        id=user_id,
        cc_id=cc_id,
        nickname=nickname,
        telegram_id=telegram_id,
        telegram_username=None,
        vault_locked_balance=0,
        vault_available_balance=0,
        level=1,
        xp=0,
        total_charge_amount=0,
        baseline_charge_amount=0,
        status="ACTIVE",
        role="USER",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_admin_user_list_and_resolve(db):
    admin_info = (999, "ADMIN")

    u1 = _seed_v2_user(db, user_id=201, cc_id="cc_201", nickname="알파", telegram_id=1201)
    u2 = _seed_v2_user(db, user_id=202, cc_id="cc_202", nickname="베타", telegram_id=1202)

    db.add(V2UserSegment(user_id=u1.id, segment="NEW"))
    db.add(V2UserSegment(user_id=u2.id, segment="COMMON"))
    db.commit()

    resp = user_routes.get_admin_users_list(
        search="알",
        status=None,
        minLevel=None,
        maxLevel=None,
        sortBy="uid",
        sortOrder="asc",
        page=1,
        limit=20,
        db=db,
        admin_info=admin_info,
    )
    assert resp.total >= 1
    assert any(u.nickname == "알파" for u in resp.users)

    resolved = user_routes.resolve_admin_user(str(u1.id), db=db, admin_info=admin_info)
    assert resolved.userId == u1.id
    assert resolved.externalId == u1.cc_id

    resolved2 = user_routes.resolve_admin_user("알파", db=db, admin_info=admin_info)
    assert resolved2.userId == u1.id

    with pytest.raises(HTTPException) as exc:
        user_routes.resolve_admin_user("", db=db, admin_info=admin_info)
    assert exc.value.status_code == 400


def test_admin_user_create_and_update_nickname(db):
    admin_info = (999, "ADMIN")

    created = user_routes.create_admin_user(
        AdminUserCreate(cc_id="cc_new_301", nickname="감마", level=1, status="ACTIVE"),
        db=db,
        admin_info=admin_info,
    )
    assert created.cc_id == "cc_new_301"
    assert created.nickname == "감마"

    updated = user_routes.update_user_nickname(
        created.id,
        AdminNicknameUpdateRequest(nickname="감마2"),
        db=db,
        admin_info=admin_info,
    )
    assert updated.success is True
    assert updated.newNickname == "감마2"

    # Duplicate nickname check
    other = _seed_v2_user(db, user_id=302, cc_id="cc_302", nickname="중복")

    with pytest.raises(HTTPException) as exc:
        user_routes.update_user_nickname(
            other.id,
            AdminNicknameUpdateRequest(nickname="감마2"),
            db=db,
            admin_info=admin_info,
        )
    assert exc.value.status_code == 409

    with pytest.raises(HTTPException) as exc2:
        user_routes.update_user_nickname(
            other.id,
            AdminNicknameUpdateRequest(nickname="  "),
            db=db,
            admin_info=admin_info,
        )
    assert exc2.value.status_code == 400
