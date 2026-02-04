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

    @staticmethod
    def get_or_create_v2_user_from_legacy(
        db: Session, cc_id: str, nickname: str | None = None
    ) -> V2User | None:
        if not cc_id:
            return None

        cc_id = cc_id.strip()
        # 1. 먼저 v2_user에서 조회
        user = db.query(V2User).filter(V2User.cc_id == cc_id).first()
        if user:
            return user

        # 2. 없으면 V2 직접 생성 (전략: V1 조회 제거)
        user = V2User(
            cc_id=cc_id,
            nickname=nickname or "User",
        )
        db.add(user)
        db.flush()

        # [Phase 3-4] HQ Prospective Matching
        from app.v2.services.segment_service import V2SegmentService
        try:
            V2SegmentService.match_prospect_on_joined(db, user)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to match prospect for {cc_id}: {e}")
            # Do not fail registration because of matching error
            
        return user

