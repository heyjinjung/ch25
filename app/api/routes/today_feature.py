"""Endpoint for querying today's active feature."""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.feature import FeatureType
from app.services.feature_service import FeatureService

router = APIRouter(prefix="/api", tags=["feature"])
feature_service = FeatureService()


@router.get("/today-feature", summary="Get today's active feature")
def get_today_feature(db: Session = Depends(get_db)) -> dict[str, FeatureType]:
    today = date.today()
    feature_type = feature_service.get_today_feature(db, today)
    return {"feature_type": feature_type}
