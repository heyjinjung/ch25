from __future__ import annotations

import hashlib
import logging
import re
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.admin_user_profile import AdminUserProfile
from app.models.user import User
from app.schemas.admin_user_summary import AdminUserSummary


_TG_EXTERNAL_ID_RE = re.compile(r"^tg_(\d+)_", re.IGNORECASE)

logger = logging.getLogger("uvicorn.error")


def _clean_username(value: str) -> str:
    return value.strip().lstrip("@").strip()


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


def _identifier_fingerprint(raw: str) -> str:
    s = (raw or "").strip().lower()
    if not s:
        return ""
    # Short, privacy-safer stable fingerprint for log aggregation.
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:10]


def derive_tg_id(user: User) -> Optional[int]:
    if getattr(user, "telegram_id", None):
        try:
            return int(user.telegram_id)
        except Exception:
            return None

    admin_profile = getattr(user, "admin_profile", None)
    if admin_profile and getattr(admin_profile, "telegram_id", None):
        raw = str(admin_profile.telegram_id).strip()
        if raw.isdigit():
            try:
                return int(raw)
            except Exception:
                return None

    external_id = (getattr(user, "external_id", "") or "").strip()
    m = _TG_EXTERNAL_ID_RE.match(external_id)
    if m:
        try:
            return int(m.group(1))
        except Exception:
            return None
    return None


def build_admin_user_summary(user: User) -> AdminUserSummary:
    admin_profile = getattr(user, "admin_profile", None)
    return AdminUserSummary(
        id=int(user.id),
        external_id=str(user.external_id),
        nickname=(user.nickname or None),
        tg_id=derive_tg_id(user),
        tg_username=(user.telegram_username or None),
        real_name=(getattr(admin_profile, "real_name", None) if admin_profile else None),
        phone_number=(getattr(admin_profile, "phone_number", None) if admin_profile else None),
        tags=(list(getattr(admin_profile, "tags", None) or []) if admin_profile else None),
        memo=(getattr(admin_profile, "memo", None) if admin_profile else None),
    )


def resolve_user_id_by_identifier(db: Session, identifier: str) -> int:
    raw = (identifier or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="IDENTIFIER_REQUIRED")

    # 1) Numeric: user_id exact match -> else telegram_id exact match
    if raw.isdigit():
        user = db.execute(select(User.id).where(User.id == int(raw))).scalar_one_or_none()
        if user is not None:
            return int(user)

        user = db.execute(select(User.id).where(User.telegram_id == int(raw))).scalar_one_or_none()
        if user is not None:
            return int(user)

        # Legacy: admin_profile.telegram_id stored as string
        user = db.execute(
            select(User.id)
            .select_from(User)
            .outerjoin(AdminUserProfile, AdminUserProfile.user_id == User.id)
            .where(AdminUserProfile.telegram_id == raw)
        ).scalar_one_or_none()
        if user is not None:
            return int(user)

    # 2) external_id pattern tg_{id}_{suffix}
    m = _TG_EXTERNAL_ID_RE.match(raw)
    if m:
        tg_id = m.group(1)
        user = db.execute(select(User.id).where(User.telegram_id == int(tg_id))).scalar_one_or_none()
        if user is not None:
            return int(user)

    # 3) telegram_username (case-insensitive, optional @)
    clean = _clean_username(raw)
    if clean:
        username_matches = db.execute(
            select(User.id).where(func.lower(User.telegram_username) == func.lower(clean))
        ).scalars().all()
        if len(username_matches) == 1:
            return int(username_matches[0])
        if len(username_matches) > 1:
            logger.info(
                "admin_user_resolve_failed",
                extra={
                    "status_code": 409,
                    "error_code": "AMBIGUOUS_IDENTIFIER",
                    "identifier_kind": _identifier_kind(raw),
                    "identifier_fp": _identifier_fingerprint(raw),
                },
            )
            raise HTTPException(status_code=409, detail="AMBIGUOUS_IDENTIFIER")

        nickname_matches = db.execute(
            select(User.id).where(func.lower(User.nickname) == func.lower(clean))
        ).scalars().all()
        if len(nickname_matches) == 1:
            return int(nickname_matches[0])
        if len(nickname_matches) > 1:
            logger.info(
                "admin_user_resolve_failed",
                extra={
                    "status_code": 409,
                    "error_code": "AMBIGUOUS_IDENTIFIER",
                    "identifier_kind": _identifier_kind(raw),
                    "identifier_fp": _identifier_fingerprint(raw),
                },
            )
            raise HTTPException(status_code=409, detail="AMBIGUOUS_IDENTIFIER")

        external_matches = db.execute(
            select(User.id).where(func.lower(User.external_id) == func.lower(clean))
        ).scalars().all()
        if len(external_matches) == 1:
            return int(external_matches[0])
        if len(external_matches) > 1:
            logger.info(
                "admin_user_resolve_failed",
                extra={
                    "status_code": 409,
                    "error_code": "AMBIGUOUS_IDENTIFIER",
                    "identifier_kind": _identifier_kind(raw),
                    "identifier_fp": _identifier_fingerprint(raw),
                },
            )
            raise HTTPException(status_code=409, detail="AMBIGUOUS_IDENTIFIER")

    logger.info(
        "admin_user_resolve_failed",
        extra={
            "status_code": 404,
            "error_code": "USER_NOT_FOUND",
            "identifier_kind": _identifier_kind(raw),
            "identifier_fp": _identifier_fingerprint(raw),
        },
    )
    raise HTTPException(status_code=404, detail="USER_NOT_FOUND")


def resolve_user_summary(db: Session, identifier: str) -> AdminUserSummary:
    user_id = resolve_user_id_by_identifier(db, identifier)
    user = (
        db.execute(select(User).options(joinedload(User.admin_profile)).where(User.id == user_id))
        .scalar_one_or_none()
    )
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    return build_admin_user_summary(user)
