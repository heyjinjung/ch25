"""Admin service for user segmentation and activity inspection."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.user_segment import UserSegment


@dataclass(frozen=True)
class AdminSegmentRow:
    user_id: int
    external_id: str
    segment: str
    segment_updated_at: datetime | None

    roulette_plays: int
    dice_plays: int
    lottery_plays: int
    total_play_duration: int

    last_login_at: datetime | None
    last_charge_at: datetime | None
    last_bonus_used_at: datetime | None
    activity_updated_at: datetime | None


class AdminSegmentService:
    @staticmethod
    def list_segments(
        db: Session,
        *,
        external_id: str | None = None,
        limit: int = 200,
    ) -> list[AdminSegmentRow]:
        cleaned_external = external_id.strip() if external_id else None
        q = (
            db.query(User, UserSegment, UserActivity)
            .outerjoin(UserSegment, UserSegment.user_id == User.id)
            .outerjoin(UserActivity, UserActivity.user_id == User.id)
        )
        if cleaned_external:
            q = q.filter(User.external_id == cleaned_external)

        rows = q.order_by(User.id.desc()).limit(limit).all()
        result: list[AdminSegmentRow] = []
        for user, seg, act in rows:
            segment_value = seg.segment if seg else "NEW"
            result.append(
                AdminSegmentRow(
                    user_id=user.id,
                    external_id=user.external_id,
                    segment=segment_value,
                    segment_updated_at=getattr(seg, "updated_at", None) if seg else None,
                    roulette_plays=getattr(act, "roulette_plays", 0) if act else 0,
                    dice_plays=getattr(act, "dice_plays", 0) if act else 0,
                    lottery_plays=getattr(act, "lottery_plays", 0) if act else 0,
                    total_play_duration=getattr(act, "total_play_duration", 0) if act else 0,
                    last_login_at=getattr(act, "last_login_at", None) if act else None,
                    last_charge_at=getattr(act, "last_charge_at", None) if act else None,
                    last_bonus_used_at=getattr(act, "last_bonus_used_at", None) if act else None,
                    activity_updated_at=getattr(act, "updated_at", None) if act else None,
                )
            )
        return result

    @staticmethod
    def upsert_segment(
        db: Session,
        *,
        user_id: int | None = None,
        external_id: str | None = None,
        segment: str,
    ) -> AdminSegmentRow:
        cleaned_external = external_id.strip() if external_id else None

        user: User | None = None
        if cleaned_external:
            user = db.query(User).filter(User.external_id == cleaned_external).first()
        if user is None and user_id is not None:
            user = db.get(User, user_id)
        if user is None:
            raise ValueError("USER_NOT_FOUND")

        seg = db.query(UserSegment).filter(UserSegment.user_id == user.id).first()
        if seg is None:
            seg = UserSegment(user_id=user.id, segment=segment)
        else:
            seg.segment = segment
        db.add(seg)
        db.commit()
        db.refresh(seg)

        # Return a single-row view (with activity if exists)
        act = db.query(UserActivity).filter(UserActivity.user_id == user.id).first()
        return AdminSegmentRow(
            user_id=user.id,
            external_id=user.external_id,
            segment=seg.segment,
            segment_updated_at=seg.updated_at,
            roulette_plays=getattr(act, "roulette_plays", 0) if act else 0,
            dice_plays=getattr(act, "dice_plays", 0) if act else 0,
            lottery_plays=getattr(act, "lottery_plays", 0) if act else 0,
            total_play_duration=getattr(act, "total_play_duration", 0) if act else 0,
            last_login_at=getattr(act, "last_login_at", None) if act else None,
            last_charge_at=getattr(act, "last_charge_at", None) if act else None,
            last_bonus_used_at=getattr(act, "last_bonus_used_at", None) if act else None,
            activity_updated_at=getattr(act, "updated_at", None) if act else None,
        )
