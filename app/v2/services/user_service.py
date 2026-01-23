"""V2 user service."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.v2.models.user import V2User


class V2UserService:
    @staticmethod
    def get_by_id(db: Session, user_id: int) -> V2User | None:
        return db.get(V2User, user_id)

    @staticmethod
    def get_by_cc_id(db: Session, cc_id: str) -> V2User | None:
        return db.query(V2User).filter(V2User.cc_id == cc_id).first()

    @staticmethod
    def create_user(db: Session, *, cc_id: str, nickname: str | None = None) -> V2User:
        if not cc_id:
            raise ValueError("cc_id is required")
        user = V2User(
            cc_id=cc_id,
            nickname=nickname,
        )
        db.add(user)
        db.flush()
        return user
