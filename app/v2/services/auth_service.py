"""V2 auth service."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.v2.models.user import V2User


class V2AuthService:
    @staticmethod
    def issue_token(
        db: Session,
        *,
        user_id: int | None = None,
        cc_id: str | None = None,
        external_id: str | None = None,
        password: str | None = None,
    ) -> tuple[str, V2User]:
        _ = password
        resolved_cc_id = (cc_id or external_id or "").strip()

        user = None
        if resolved_cc_id:
            user = db.query(V2User).filter(V2User.cc_id == resolved_cc_id).first()
        if user is None and user_id is not None:
            user = db.get(V2User, user_id)
        if user is None:
            raise ValueError("USER_NOT_FOUND")

        token = create_access_token(user_id=int(user.id))
        return token, user
