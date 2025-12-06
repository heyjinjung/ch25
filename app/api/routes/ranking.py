"""Ranking API routes."""
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.ranking import RankingTodayResponse
from app.services.ranking_service import RankingService

router = APIRouter(prefix="/api/ranking", tags=["ranking"])
service = RankingService()


@router.get("/today", response_model=RankingTodayResponse)
def ranking_today(top_n: int = Query(10, ge=1, le=100), db: Session = Depends(get_db)) -> RankingTodayResponse:
    # TODO: replace with authenticated user
    user_id = 1
    today = date.today()
    return service.get_today_ranking(db=db, user_id=user_id, now=today, top_n=top_n)
