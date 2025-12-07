"""Simple token issuance endpoint."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import create_access_token
from app.models.user import User
from app.models.feature import UserEventLog

router = APIRouter(prefix="/api/auth", tags=["auth"])


class TokenRequest(BaseModel):
    user_id: int
    external_id: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/token", response_model=TokenResponse, summary="Issue JWT for user")
def issue_token(payload: TokenRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.get(User, payload.user_id)
    if not user:
        external = payload.external_id or f"user-{payload.user_id}"
        user = User(id=payload.user_id, external_id=external, status="ACTIVE")
        db.add(user)
    # Capture client IP best-effort
    client_ip = request.client.host if request.client else None
    if not client_ip:
        client_ip = "unknown"

    try:
        # Update login audit fields
        user.last_login_at = datetime.utcnow()
        user.last_login_ip = client_ip

        # Insert login event log
        db.add(
            UserEventLog(
                user_id=user.id,
                feature_type="AUTH",
                event_name="AUTH_LOGIN",
                meta_json={"external_id": user.external_id, "ip": client_ip},
            )
        )

        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="USER_CREATE_FAILED")

    token = create_access_token(user_id=user.id)
    return TokenResponse(access_token=token)
