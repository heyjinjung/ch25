"""Endpoint for querying today's active feature."""
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.models.feature import FeatureType
from app.services.feature_service import FeatureService

router = APIRouter(prefix="/api", tags=["feature"])
feature_service = FeatureService()


@router.get("/today-feature", summary="Get today's active feature")
def get_today_feature(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)) -> dict[str, FeatureType]:
    now_kst = datetime.now(ZoneInfo("Asia/Seoul"))
    feature_type = feature_service.get_today_feature(db, now_kst)
    return {"feature_type": feature_type, "user_id": user_id}
