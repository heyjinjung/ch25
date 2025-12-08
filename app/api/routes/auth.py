"""Simple token issuance endpoint."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.models.feature import UserEventLog

router = APIRouter(prefix="/api/auth", tags=["auth"])


class TokenRequest(BaseModel):
    user_id: int | None = None
    external_id: str | None = None
    password: str | None = None


class AuthUser(BaseModel):
    id: int
    external_id: str
    nickname: str | None = None
    status: str | None = None
    level: int | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser


@router.post("/token", response_model=TokenResponse, summary="Issue JWT for user")
def issue_token(payload: TokenRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    # Find user either by id or external_id
    user = None
    if payload.user_id is not None:
        user = db.get(User, payload.user_id)
    if user is None and payload.external_id:
        user = db.query(User).filter(User.external_id == payload.external_id).first()

    # Auto-create only if user_id provided (legacy flow) and user is missing.
    if user is None:
        if payload.external_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="USER_NOT_FOUND")
        # Create with auto id when only external_id is provided
        user = User(external_id=payload.external_id, status="ACTIVE")
        if payload.password:
            from app.core.security import hash_password  # local import

            user.password_hash = hash_password(payload.password)
        db.add(user)
    # Capture client IP best-effort
    client_ip = request.client.host if request.client else None
    if not client_ip:
        client_ip = "unknown"

    # If password is set, require verification unless no password stored.
    if user.password_hash:
        if not payload.password or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="INVALID_CREDENTIALS")
    elif payload.password:
        # If no password stored yet and client provided one, set it as initial secret.
        from app.core.security import hash_password  # local import to avoid cycle

        user.password_hash = hash_password(payload.password)

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
    return TokenResponse(
        access_token=token,
        user=AuthUser(
            id=user.id,
            external_id=user.external_id,
            nickname=user.nickname,
            status=user.status,
            level=user.level,
        ),
    )
