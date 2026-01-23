from datetime import date, datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.models.user import User
from app.schemas.admin_user import AdminUserCreate
from app.v2.services.admin_audit_service import V2AdminAuditService

class V2AdminUserService:
    @staticmethod
    def _clean_telegram_username(value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = str(value).strip().lstrip("@").strip()
        return cleaned or None

    @staticmethod
    def create_user(db: Session, payload: AdminUserCreate) -> User:
        """Create a user with V2 standard logic."""
        # Simple existence check
        if payload.user_id is not None and db.get(User, payload.user_id):
            from fastapi import HTTPException
            raise HTTPException(status_code=409, detail="USER_ID_EXISTS")
            
        if db.query(User).filter(User.external_id == payload.external_id).first():
            from fastapi import HTTPException
            raise HTTPException(status_code=409, detail="EXTERNAL_ID_EXISTS")

        nickname = payload.nickname or payload.telegram_username or payload.external_id
        telegram_username = V2AdminUserService._clean_telegram_username(payload.telegram_username)

        user = User(
            id=payload.user_id,
            external_id=payload.external_id,
            nickname=nickname,
            level=payload.level or 1,
            xp=payload.xp or 0,
            status=payload.status or "ACTIVE",
            telegram_id=payload.telegram_id,
            telegram_username=telegram_username,
        )
        if payload.password:
            user.password_hash = hash_password(payload.password)

        db.add(user)
        db.flush() # Return user object but don't commit yet; caller might want to audit/modify
        
        return user
