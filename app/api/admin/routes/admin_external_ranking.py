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

router = APIRouter(prefix="/admin/api/external-ranking", tags=["admin-external-ranking"])


@router.get("/", response_model=ExternalRankingListResponse)
def list_external_ranking(db: Session = Depends(get_db)) -> ExternalRankingListResponse:
    rows = AdminExternalRankingService.list_all(db)
    return ExternalRankingListResponse(items=[ExternalRankingEntry.model_validate(r) for r in rows])


@router.post("/", response_model=ExternalRankingListResponse)
def upsert_external_ranking(
    payloads: List[ExternalRankingCreate],
    db: Session = Depends(get_db),
) -> ExternalRankingListResponse:
    rows = AdminExternalRankingService.upsert_many(db, payloads)
    return ExternalRankingListResponse(items=[ExternalRankingEntry.model_validate(r) for r in rows])


@router.put("/{user_id}", response_model=ExternalRankingEntry)
def update_external_ranking(
    user_id: int,
    payload: ExternalRankingUpdate,
    db: Session = Depends(get_db),
) -> ExternalRankingEntry:
    row = AdminExternalRankingService.update(db, user_id, payload)
    return ExternalRankingEntry.model_validate(row)


@router.delete("/{user_id}", status_code=204)
def delete_external_ranking(user_id: int, db: Session = Depends(get_db)) -> None:
    AdminExternalRankingService.delete(db, user_id)
