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
def get_today_feature(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> dict[str, str | int]:
    now_kst = datetime.now(ZoneInfo("Asia/Seoul"))
    feature_type = feature_service.get_today_feature(db, now_kst)
    # Ensure the response uses the enum value (string) for schema compatibility.
    feature_value = feature_type.value if hasattr(feature_type, "value") else feature_type
    return {"feature_type": feature_value, "user_id": user_id}
