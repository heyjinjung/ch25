from __future__ import annotations

import hashlib
import logging
import re
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, select, String
from sqlalchemy.orm import Session, joinedload

from app.models.admin_user_profile import AdminUserProfile
from app.v2.models.user import V2User
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


def derive_tg_id(user: V2User) -> Optional[int]:
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


def build_admin_user_summary(user: V2User) -> AdminUserSummary:
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

    # Numeric identifier (no prefix): prefer user_id over telegram_id.
    # This prevents collision cases where a user's telegram_id equals another user's id.
    if raw.isdigit():
        val = int(raw)
        user = db.execute(select(V2User.id).where(V2User.id == val)).scalar_one_or_none()
        if user is not None:
            return int(user)
        user = db.execute(select(V2User.id).where(V2User.telegram_id == val)).scalar_one_or_none()
        if user is not None:
            return int(user)
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    # --- PREFIX BASED Explicit Search ---
    # 1. uid:
    if raw.lower().startswith("uid:"):
        val = raw[4:].strip()
        if val.isdigit():
            user = db.execute(select(V2User.id).where(V2User.id == int(val))).scalar_one_or_none()
            if user: return int(user)
        # Fallthrough to 404 if explicit request fails
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND (uid mismatch)")

    # 2. tgid:
    if raw.lower().startswith("tgid:"):
        val = raw[5:].strip()
        if val.isdigit():
            user = db.execute(select(V2User.id).where(V2User.telegram_id == int(val))).scalar_one_or_none()
            if user: return int(user)
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND (tgid mismatch)")

    # 3. cc: (External ID)
    if raw.lower().startswith("cc:"):
        val = raw[3:].strip()
        user = db.execute(select(V2User.id).where(V2User.external_id == val)).scalar_one_or_none()
        if user: return int(user)
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND (cc mismatch)")

    # 4. name: (Real Name)
    if raw.lower().startswith("name:"):
        val = raw[5:].strip()
        user = db.execute(
            select(V2User.id)
            .select_from(V2User)
            .join(AdminUserProfile, AdminUserProfile.user_id == V2User.id)
            .where(func.lower(AdminUserProfile.real_name) == func.lower(val))
        ).scalar_one_or_none()
        if user: return int(user)
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND (name mismatch)")

    # 5. phone: (Phone Number)
    if raw.lower().startswith("phone:"):
        val = raw[6:].strip()
        # Remove dashes for flexible search if needed, but strict for now
        user = db.execute(
            select(V2User.id) 
            .select_from(V2User)
            .join(AdminUserProfile, AdminUserProfile.user_id == V2User.id)
            .where(func.lower(AdminUserProfile.phone_number) == func.lower(val))
        ).scalar_one_or_none()
        if user: return int(user)
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND (phone mismatch)")

    # 6. tag: (Tags - JSON Partial Match)
    # Using simple string match for JSON for compatibility, or JSON_CONTAINS if MySQL 5.7+
    if raw.lower().startswith("tag:"):
        val = raw[4:].strip()
        # For JSON tags column, accurate search can be tricky across DBs.
        # We'll use a LIKE query on the casted text or JSON_CONTAINS.
        # Assuming MySQL: JSON_CONTAINS(tags, '"val"')
        # But commonly just LIKE '%"val"%' works for simple arrays.
        users = db.execute(
            select(V2User.id)
            .select_from(V2User)
            .join(AdminUserProfile, AdminUserProfile.user_id == V2User.id)
            .where(func.cast(AdminUserProfile.tags, String).ilike(f'%"{val}"%'))
        ).scalars().all()
        if len(users) == 1: return int(users[0])
        if len(users) > 1: raise HTTPException(status_code=409, detail="AMBIGUOUS_IDENTIFIER (multiple users with tag)")
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND (tag mismatch)")

    # 7. memo: (Memo - Partial Match)
    if raw.lower().startswith("memo:"):
        val = raw[5:].strip()
        users = db.execute(
            select(V2User.id)
            .select_from(V2User)
            .join(AdminUserProfile, AdminUserProfile.user_id == V2User.id)
            .where(AdminUserProfile.memo.ilike(f"%{val}%"))
        ).scalars().all()
        if len(users) == 1: return int(users[0])
        if len(users) > 1: raise HTTPException(status_code=409, detail="AMBIGUOUS_IDENTIFIER (multiple users found via memo)")
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND (memo mismatch)")

    # --- DEFAULT LOGIC (No Prefix = Text Search Priority) ---
    # Policy Update: 
    # - User ID requires 'uid:' prefix.
    # - Telegram ID requires 'tgid:' prefix.
    # - Raw input is treated as text (Nickname > Username > Realname > CCID).

    # Priority A: Pattern tg_{id}_ (Special Case: Explicit External ID format)
    m = _TG_EXTERNAL_ID_RE.match(raw)
    if m:
        tg_id = m.group(1)
        user = db.execute(select(V2User.id).where(V2User.telegram_id == int(tg_id))).scalar_one_or_none()
        if user is not None:
            return int(user)

    # Priority C: Text Search (Username, Nickname, RealName, CC ID)
    clean = _clean_username(raw) # removes @ if present

    # C-1. Telegram Username (Exact match preferred for @input)
    # If input starts with @, strictly imply username.
    if raw.startswith("@"):
        username_matches = db.execute(
            select(V2User.id).where(func.lower(V2User.telegram_username) == func.lower(clean))
        ).scalars().all()
        if len(username_matches) == 1: return int(username_matches[0])
        # If ambiguous or not found for explicit @, we might still fallback or fail.
        # But per requirements: "@" implies Username priority.

    # Matchers for general text
    # 1. Nickname (Highest Ops Priority)
    nickname_matches = db.execute(
        select(V2User.id).where(func.lower(V2User.nickname) == func.lower(clean))
    ).scalars().all()
    if len(nickname_matches) == 1: 
        return int(nickname_matches[0])
    
    # 2. Real Name (Second Priority per User Request)
    realname_matches = db.execute(
        select(V2User.id)
        .select_from(V2User)
        .join(AdminUserProfile, AdminUserProfile.user_id == V2User.id)
        .where(func.lower(AdminUserProfile.real_name) == func.lower(clean))
    ).scalars().all()
    if len(realname_matches) == 1:
        return int(realname_matches[0])

    # 3. Telegram Username (if not already matched)
    username_matches = db.execute(
        select(V2User.id).where(func.lower(V2User.telegram_username) == func.lower(clean))
    ).scalars().all()
    if len(username_matches) == 1: 
        return int(username_matches[0])

    # 4. External ID (CC ID)
    external_matches = db.execute(
        select(V2User.id).where(func.lower(V2User.external_id) == func.lower(clean))
    ).scalars().all()
    if len(external_matches) == 1: 
        return int(external_matches[0])

    # Conflict Handling (Ambiguous)
    total_found = len(nickname_matches) + len(username_matches) + len(realname_matches) + len(external_matches)
    if total_found > 1:
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
        db.execute(select(V2User).options(joinedload(V2User.admin_profile)).where(V2User.id == user_id))
        .scalar_one_or_none()
    )
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    return build_admin_user_summary(user)
