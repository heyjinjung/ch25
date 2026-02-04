"""Admin endpoints for CC deposit data.

V2 location (Source of Truth). Legacy import paths should re-export this router.

NOTE: URL is intentionally kept as `/admin/api/external-ranking` for backward compatibility.
"""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db
from app.v2.models.user import V2User
from app.v2.schemas.shared.cc_deposit import CCDepositCreate, CCDepositEntry, CCDepositListResponse, CCDepositUpdate
from app.v2.services import V2AdminAuditService, V2AdminCCDepositService, V2AdminUserService

router = APIRouter(prefix="/admin/api/external-ranking", tags=["Admin (CC Deposit)"])


@router.get("/", response_model=CCDepositListResponse)
def list_cc_deposit(db: Session = Depends(get_db)) -> CCDepositListResponse:
    rows = V2AdminCCDepositService.list_all(db)
    user_ids = [r.user_id for r in rows]
    users = (
        db.query(V2User)
        .options(joinedload(V2User.admin_profile))
        .filter(V2User.id.in_(user_ids))
        .all()
        if user_ids
        else []
    )
    user_summary_by_id = {u.id: V2AdminUserService.build_summary(u) for u in users}
    items = [
        CCDepositEntry(
            id=row.id,
            user_id=row.user_id,
            cc_id=(
                user_summary_by_id.get(row.user_id).cc_id
                if user_summary_by_id.get(row.user_id)
                else None
            ),
            telegram_username=(
                user_summary_by_id.get(row.user_id).tg_username
                if user_summary_by_id.get(row.user_id)
                else None
            ),
            user=user_summary_by_id.get(row.user_id),
            deposit_amount=row.deposit_amount,
            play_count=row.play_count,
            memo=row.memo,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
        for row in rows
    ]
    return CCDepositListResponse(items=items)


@router.post("/", response_model=CCDepositListResponse)
def upsert_cc_deposit_batch(
    payloads: List[CCDepositCreate],
    db: Session = Depends(get_db),
) -> CCDepositListResponse:
    rows = V2AdminCCDepositService.upsert_many(db, payloads)
    user_ids = [r.user_id for r in rows]
    users = (
        db.query(V2User)
        .options(joinedload(V2User.admin_profile))
        .filter(V2User.id.in_(user_ids))
        .all()
        if user_ids
        else []
    )
    user_summary_by_id = {u.id: V2AdminUserService.build_summary(u) for u in users}
    items = [
        CCDepositEntry(
            id=row.id,
            user_id=row.user_id,
            cc_id=(
                user_summary_by_id.get(row.user_id).cc_id
                if user_summary_by_id.get(row.user_id)
                else None
            ),
            telegram_username=(
                user_summary_by_id.get(row.user_id).tg_username
                if user_summary_by_id.get(row.user_id)
                else None
            ),
            user=user_summary_by_id.get(row.user_id),
            deposit_amount=row.deposit_amount,
            play_count=row.play_count,
            memo=row.memo,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
        for row in rows
    ]
    return CCDepositListResponse(items=items)


@router.put("/{user_id}", response_model=CCDepositEntry)
def update_cc_deposit(
    user_id: int,
    payload: CCDepositUpdate,
    db: Session = Depends(get_db),
) -> CCDepositEntry:
    row = V2AdminCCDepositService.update(db, user_id, payload)
    user = (
        db.query(V2User)
        .options(joinedload(V2User.admin_profile))
        .filter(V2User.id == row.user_id)
        .first()
    )
    summary = V2AdminUserService.build_summary(user) if user else None
    cc_id = summary.cc_id if summary else None
    telegram_username = summary.tg_username if summary else None
    return CCDepositEntry(
        id=row.id,
        user_id=row.user_id,
        cc_id=cc_id,
        telegram_username=telegram_username,
        user=summary,
        deposit_amount=row.deposit_amount,
        play_count=row.play_count,
        memo=row.memo,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.put("/by-identifier/{identifier}", response_model=CCDepositEntry)
def update_cc_deposit_by_identifier(
    identifier: str,
    payload: CCDepositUpdate,
    db: Session = Depends(get_db),
) -> CCDepositEntry:
    # Accept external_id / telegram_username / nickname in a single string.
    resolved_user_id = V2AdminUserService.resolve_user_id(db, identifier)
    row = V2AdminCCDepositService.update(db, resolved_user_id, payload)

    user = (
        db.query(V2User)
        .options(joinedload(V2User.admin_profile))
        .filter(V2User.id == row.user_id)
        .first()
    )
    summary = V2AdminUserService.build_summary(user) if user else None
    cc_id = summary.cc_id if summary else None
    telegram_username = summary.tg_username if summary else None
    return CCDepositEntry(
        id=row.id,
        user_id=row.user_id,
        cc_id=cc_id,
        telegram_username=telegram_username,
        user=summary,
        deposit_amount=row.deposit_amount,
        play_count=row.play_count,
        memo=row.memo,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.delete("/{user_id}")
def delete_cc_deposit(user_id: int, db: Session = Depends(get_db)) -> dict:
    V2AdminCCDepositService.delete(db, user_id)
    return {"ok": True}


@router.delete("/by-identifier/{identifier}")
def delete_cc_deposit_by_identifier(identifier: str, db: Session = Depends(get_db)) -> dict:
    resolved_user_id = V2AdminUserService.resolve_user_id(db, identifier)
    V2AdminCCDepositService.delete(db, resolved_user_id)
    return {"ok": True}
