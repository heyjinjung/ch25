"""Admin endpoints for external ranking data."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import joinedload
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.external_ranking import (
    ExternalRankingCreate,
    ExternalRankingEntry,
    ExternalRankingListResponse,
    ExternalRankingUpdate,
)
from app.services.admin_external_ranking_service import AdminExternalRankingService
from app.models.user import User
from app.services.admin_user_identity_service import build_admin_user_summary

router = APIRouter(prefix="/admin/api/external-ranking", tags=["admin-external-ranking"])


@router.get("/", response_model=ExternalRankingListResponse)
def list_external_ranking(db: Session = Depends(get_db)) -> ExternalRankingListResponse:
    rows = AdminExternalRankingService.list_all(db)
    user_ids = [r.user_id for r in rows]
    users = (
        db.query(User)
        .options(joinedload(User.admin_profile))
        .filter(User.id.in_(user_ids))
        .all()
        if user_ids
        else []
    )
    user_summary_by_id = {u.id: build_admin_user_summary(u) for u in users}
    items = [
        ExternalRankingEntry(
            id=row.id,
            user_id=row.user_id,
            external_id=(user_summary_by_id.get(row.user_id).external_id if user_summary_by_id.get(row.user_id) else None),
            telegram_username=(user_summary_by_id.get(row.user_id).tg_username if user_summary_by_id.get(row.user_id) else None),
            user=user_summary_by_id.get(row.user_id),
            deposit_amount=row.deposit_amount,
            play_count=row.play_count,
            memo=row.memo,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
        for row in rows
    ]
    return ExternalRankingListResponse(items=items)


@router.post("/", response_model=ExternalRankingListResponse)
def upsert_external_ranking(
    payloads: List[ExternalRankingCreate],
    db: Session = Depends(get_db),
) -> ExternalRankingListResponse:
    rows = AdminExternalRankingService.upsert_many(db, payloads)
    user_ids = [r.user_id for r in rows]
    users = (
        db.query(User)
        .options(joinedload(User.admin_profile))
        .filter(User.id.in_(user_ids))
        .all()
        if user_ids
        else []
    )
    user_summary_by_id = {u.id: build_admin_user_summary(u) for u in users}
    items = [
        ExternalRankingEntry(
            id=row.id,
            user_id=row.user_id,
            external_id=(user_summary_by_id.get(row.user_id).external_id if user_summary_by_id.get(row.user_id) else None),
            telegram_username=(user_summary_by_id.get(row.user_id).tg_username if user_summary_by_id.get(row.user_id) else None),
            user=user_summary_by_id.get(row.user_id),
            deposit_amount=row.deposit_amount,
            play_count=row.play_count,
            memo=row.memo,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
        for row in rows
    ]
    return ExternalRankingListResponse(items=items)


@router.put("/{user_id}", response_model=ExternalRankingEntry)
def update_external_ranking(
    user_id: int,
    payload: ExternalRankingUpdate,
    db: Session = Depends(get_db),
) -> ExternalRankingEntry:
    row = AdminExternalRankingService.update(db, user_id, payload)
    user = db.query(User).options(joinedload(User.admin_profile)).filter(User.id == row.user_id).first()
    summary = build_admin_user_summary(user) if user else None
    external_id = summary.external_id if summary else None
    telegram_username = summary.tg_username if summary else None
    return ExternalRankingEntry(
        id=row.id,
        user_id=row.user_id,
        external_id=external_id,
        telegram_username=telegram_username,
        user=summary,
        deposit_amount=row.deposit_amount,
        play_count=row.play_count,
        memo=row.memo,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.put("/by-identifier/{identifier}", response_model=ExternalRankingEntry)
def update_external_ranking_by_identifier(
    identifier: str,
    payload: ExternalRankingUpdate,
    db: Session = Depends(get_db),
) -> ExternalRankingEntry:
    # Accept external_id / telegram_username / nickname in a single string.
    resolved_user_id = AdminExternalRankingService._resolve_user_id(db, None, identifier, identifier)
    row = AdminExternalRankingService.update(db, resolved_user_id, payload)
    user = db.query(User).options(joinedload(User.admin_profile)).filter(User.id == row.user_id).first()
    summary = build_admin_user_summary(user) if user else None
    external_id = summary.external_id if summary else None
    telegram_username = summary.tg_username if summary else None
    return ExternalRankingEntry(
        id=row.id,
        user_id=row.user_id,
        external_id=external_id,
        telegram_username=telegram_username,
        user=summary,
        deposit_amount=row.deposit_amount,
        play_count=row.play_count,
        memo=row.memo,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.delete("/{user_id}", status_code=204)
def delete_external_ranking(user_id: int, db: Session = Depends(get_db)) -> None:
    AdminExternalRankingService.delete(db, user_id)


@router.delete("/by-identifier/{identifier}", status_code=204)
def delete_external_ranking_by_identifier(identifier: str, db: Session = Depends(get_db)) -> None:
    resolved_user_id = AdminExternalRankingService._resolve_user_id(db, None, identifier, identifier)
    AdminExternalRankingService.delete(db, resolved_user_id)
