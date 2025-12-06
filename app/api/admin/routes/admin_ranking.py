# /workspace/ch25/app/api/admin/routes/admin_ranking.py
from datetime import date
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.admin_ranking import AdminRankingEntryCreate, AdminRankingListResponse
from app.services.admin_ranking_service import AdminRankingService

router = APIRouter(prefix="/admin/api/ranking", tags=["admin-ranking"])


@router.get("/{day}", response_model=AdminRankingListResponse)
def get_ranking(day: date, db: Session = Depends(get_db)) -> AdminRankingListResponse:
    items = AdminRankingService.list_ranking(db, day)
    return AdminRankingListResponse(date=day, items=items)


@router.put("/{day}", response_model=AdminRankingListResponse)
def replace_ranking(
    day: date,
    entries: List[AdminRankingEntryCreate],
    db: Session = Depends(get_db),
) -> AdminRankingListResponse:
    AdminRankingService.upsert_ranking_entries(db, day, entries)
    items = AdminRankingService.list_ranking(db, day)
    return AdminRankingListResponse(date=day, items=items)


@router.delete("/{day}", status_code=204)
def delete_ranking(day: date, db: Session = Depends(get_db)) -> None:
    AdminRankingService.delete_ranking_for_date(db, day)
