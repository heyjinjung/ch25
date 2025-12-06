"""Simple token issuance endpoint."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import create_access_token
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


class TokenRequest(BaseModel):
    user_id: int
    external_id: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/token", response_model=TokenResponse, summary="Issue JWT for user")
def issue_token(payload: TokenRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.get(User, payload.user_id)
    if not user:
        external = payload.external_id or f"user-{payload.user_id}"
        user = User(id=payload.user_id, external_id=external, status="ACTIVE")
        db.add(user)
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="USER_CREATE_FAILED")
    token = create_access_token(user_id=user.id)
    return TokenResponse(access_token=token)
*** End Patch