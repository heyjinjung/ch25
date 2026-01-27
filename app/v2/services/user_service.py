"""V2 user service."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.user import User
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

    @staticmethod
    def get_or_create_v2_user_from_legacy(db: Session, cc_id: str) -> V2User | None:
        if not cc_id:
            return None
        
        cc_id = cc_id.strip()
        # 1. 먼저 v2_user에서 조회
        user = db.query(V2User).filter(V2User.cc_id == cc_id).first()
        if user:
            return user
            
        # 2. 없으면 통합 Master User 테이블에서 조회하여 V2 생성 (JIT Sync)
        legacy_user = db.query(User).filter(User.external_id == cc_id).first()
        if legacy_user:
            user = V2User(
                id=legacy_user.id, # ID 명시적 승계
                cc_id=cc_id,
                nickname=legacy_user.nickname,
                telegram_id=legacy_user.telegram_id,
                telegram_username=legacy_user.telegram_username,
            )
            db.add(user)
            db.flush() # ID 생성을 위해 flush
            return user
            
        return None

    @staticmethod
    def ensure_legacy_user_id(db: Session, v2_user_id: int, *, sync_vault: bool = False) -> int:
        v2_user = db.get(V2User, v2_user_id)
        if v2_user is None:
            raise ValueError("v2 user not found")
        cc_id = (v2_user.cc_id or "").strip()
        if not cc_id:
            raise ValueError("v2 user missing cc_id")

        legacy_user = db.query(User).filter(User.external_id == cc_id).first()
        if legacy_user is None:
            legacy_user = User(
                external_id=cc_id,
                nickname=v2_user.nickname or "V2 User",
                level=1,
            )
            db.add(legacy_user)
            db.flush()
        if sync_vault:
            legacy_user.vault_locked_balance = int(v2_user.vault_locked_balance or 0)
            db.add(legacy_user)
            db.flush()
        return int(legacy_user.id)
