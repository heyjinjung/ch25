"""Admin endpoints for external ranking data."""
from typing import List

from fastapi import APIRouter, Depends
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

router = APIRouter(prefix="/admin/api/external-ranking", tags=["admin-external-ranking"])


@router.get("/", response_model=ExternalRankingListResponse)
def list_external_ranking(db: Session = Depends(get_db)) -> ExternalRankingListResponse:
    rows = AdminExternalRankingService.list_all(db)
    user_map = {
        row.id: {"external_id": row.external_id, "telegram_username": row.telegram_username}
        for row in db.query(User.id, User.external_id, User.telegram_username)
        .filter(User.id.in_([r.user_id for r in rows]))
        .all()
    }
    items = [
        ExternalRankingEntry(
            id=row.id,
            user_id=row.user_id,
            external_id=(user_map.get(row.user_id) or {}).get("external_id"),
            telegram_username=(user_map.get(row.user_id) or {}).get("telegram_username"),
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
    user_map = {
        row.id: {"external_id": row.external_id, "telegram_username": row.telegram_username}
        for row in db.query(User.id, User.external_id, User.telegram_username)
        .filter(User.id.in_([r.user_id for r in rows]))
        .all()
    }
    items = [
        ExternalRankingEntry(
            id=row.id,
            user_id=row.user_id,
            external_id=(user_map.get(row.user_id) or {}).get("external_id"),
            telegram_username=(user_map.get(row.user_id) or {}).get("telegram_username"),
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
    user = db.query(User.external_id, User.telegram_username).filter(User.id == row.user_id).first()
    external_id = user.external_id if user else None
    telegram_username = user.telegram_username if user else None
    return ExternalRankingEntry(
        id=row.id,
        user_id=row.user_id,
        external_id=external_id,
        telegram_username=telegram_username,
        deposit_amount=row.deposit_amount,
        play_count=row.play_count,
        memo=row.memo,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.delete("/{user_id}", status_code=204)
def delete_external_ranking(user_id: int, db: Session = Depends(get_db)) -> None:
    AdminExternalRankingService.delete(db, user_id)
