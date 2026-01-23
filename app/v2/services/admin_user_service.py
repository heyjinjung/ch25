from datetime import date, datetime
import hashlib
import logging
import re
from typing import Any, Optional
from fastapi import HTTPException
from sqlalchemy import func, select, String
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password
from app.models.user import User
from app.models.admin_user_profile import AdminUserProfile
from app.schemas.admin_user import AdminUserCreate
from app.v2.schemas.v2_admin_user_summary import AdminUserSummary
from app.v2.services.admin_audit_service import V2AdminAuditService

_TG_EXTERNAL_ID_RE = re.compile(r"^tg_(\d+)_", re.IGNORECASE)
logger = logging.getLogger("uvicorn.error")

class V2AdminUserService:
    @staticmethod
    def _clean_telegram_username(value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = str(value).strip().lstrip("@").strip()
        return cleaned or None

    @staticmethod
    def _identifier_kind(raw: str) -> str:
        s = (raw or "").strip()
        if not s:
            return "empty"
        if s.isdigit():
            return "numeric"
        if _TG_EXTERNAL_ID_RE.match(s):
            return "tg_external_id"
        if s.startswith("@"):
            return "username"
        return "text"

    @staticmethod
    def _identifier_fingerprint(raw: str) -> str:
        s = (raw or "").strip().lower()
        if not s:
            return ""
        return hashlib.sha256(s.encode("utf-8")).hexdigest()[:10]

    @staticmethod
    def create_user(db: Session, payload: AdminUserCreate) -> User:
        """Create a user with V2 standard logic."""
        # Simple existence check
        if payload.user_id is not None and db.get(User, payload.user_id):
            raise HTTPException(status_code=409, detail="USER_ID_EXISTS")
            
        if db.query(User).filter(User.external_id == payload.external_id).first():
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
        db.flush()
        
        return user

    @staticmethod
    def derive_tg_id(user: User) -> Optional[int]:
        if getattr(user, "telegram_id", None):
            try:
                return int(user.telegram_id)
            except Exception:
                pass

        admin_profile = getattr(user, "admin_profile", None)
        if admin_profile and getattr(admin_profile, "telegram_id", None):
            raw = str(admin_profile.telegram_id).strip()
            if raw.isdigit():
                try:
                    return int(raw)
                except Exception:
                    pass

        external_id = (getattr(user, "external_id", "") or "").strip()
        m = _TG_EXTERNAL_ID_RE.match(external_id)
        if m:
            try:
                return int(m.group(1))
            except Exception:
                pass
        return None

    @staticmethod
    def build_summary(user: User) -> AdminUserSummary:
        admin_profile = getattr(user, "admin_profile", None)
        return AdminUserSummary(
            id=int(user.id),
            external_id=str(user.external_id),
            nickname=(user.nickname or None),
            tg_id=V2AdminUserService.derive_tg_id(user),
            tg_username=(user.telegram_username or None),
            real_name=(getattr(admin_profile, "real_name", None) if admin_profile else None),
            phone_number=(getattr(admin_profile, "phone_number", None) if admin_profile else None),
            tags=(list(getattr(admin_profile, "tags", None) or []) if admin_profile else None),
            memo=(getattr(admin_profile, "memo", None) if admin_profile else None),
        )

    @staticmethod
    def resolve_user_id(db: Session, identifier: str) -> int:
        raw = (identifier or "").strip()
        if not raw:
            raise HTTPException(status_code=400, detail="IDENTIFIER_REQUIRED")

        if raw.isdigit():
            val = int(raw)
            user_id = db.execute(select(User.id).where(User.id == val)).scalar_one_or_none()
            if user_id is not None:
                return int(user_id)
            user_id = db.execute(select(User.id).where(User.telegram_id == val)).scalar_one_or_none()
            if user_id is not None:
                return int(user_id)
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        # Text search (Username, Nickname, RealName, CCID)
        clean = (raw or "").strip().lstrip("@").strip()

        # Try exact matches
        # 1. Nickname
        match = db.execute(select(User.id).where(func.lower(User.nickname) == func.lower(clean))).scalar_one_or_none()
        if match: return int(match)

        # 2. Telegram Username
        match = db.execute(select(User.id).where(func.lower(User.telegram_username) == func.lower(clean))).scalar_one_or_none()
        if match: return int(match)

        # 3. External ID
        match = db.execute(select(User.id).where(func.lower(User.external_id) == func.lower(clean))).scalar_one_or_none()
        if match: return int(match)

        # 4. Real Name
        record = db.execute(
            select(User.id).join(AdminUserProfile).where(func.lower(AdminUserProfile.real_name) == func.lower(clean))
        ).scalar_one_or_none()
        if record: return int(record)

        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    @staticmethod
    def resolve_summary(db: Session, identifier: str) -> AdminUserSummary:
        user_id = V2AdminUserService.resolve_user_id(db, identifier)
        user = db.execute(
            select(User).options(joinedload(User.admin_profile)).where(User.id == user_id)
        ).scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        return V2AdminUserService.build_summary(user)
