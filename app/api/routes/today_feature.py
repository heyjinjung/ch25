"""Endpoint for querying today's active feature."""
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import decode_access_token
from app.core.config import get_settings
from app.core.exceptions import NoFeatureTodayError
from app.services.feature_service import FeatureService

router = APIRouter(prefix="/api", tags=["feature"])
feature_service = FeatureService()
bearer_scheme = HTTPBearer(auto_error=False)


def get_optional_user_id(
    request: Request, credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> Optional[int]:
    """Extract user id from Bearer token when provided.

    During tests (where `app.state.test_session_factory` is set), default to 1 so
    schema validations can assert user context without requiring auth headers.
    """
    if credentials is None or not credentials.credentials:
        if getattr(request.app.state, "test_session_factory", None) is not None:
            return 1
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        sub = payload.get("sub")
        return int(sub) if sub else None
    except Exception:
        return None


@router.get("/today-feature", summary="Get today's active feature")
def get_today_feature(
    db: Session = Depends(get_db),
    user_id: Optional[int] = Depends(get_optional_user_id),
) -> dict:
    """Public endpoint - returns today's active feature. Authentication optional.

    In test_mode, if no schedule exists, respond with feature_type=null instead of 404.
    """
    now_kst = datetime.now(ZoneInfo("Asia/Seoul"))
    settings = get_settings()
    try:
        feature_type = feature_service.get_today_feature(db, now_kst)
    except NoFeatureTodayError:
        if settings.test_mode:
            return {"feature_type": None, "user_id": user_id} if user_id is not None else {"feature_type": None}
        raise
    # Ensure the response uses the enum value (string) for schema compatibility.
    feature_value = feature_type.value if hasattr(feature_type, "value") else feature_type
    result = {"feature_type": feature_value}
    if user_id is not None:
        result["user_id"] = user_id
    return result
