"""V2 admin message fan-out service."""
from __future__ import annotations

from typing import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.v2.models.v2_admin_message import V2AdminMessage, V2AdminMessageInbox
from app.v2.models.v2_user_segment import V2UserSegment
from app.v2.models.user import V2User


class V2AdminMessageService:
    @staticmethod
    def create_message(
        db: Session,
        *,
        sender_admin_id: int,
        title: str,
        content: str,
        target_type: str,
        target_value: str | None,
        channels: list[str] | None = None,
    ) -> V2AdminMessage:
        # PUSH 기능은 제거됨: 채널 입력과 무관하게 INBOX만 저장/사용한다.
        msg = V2AdminMessage(
            sender_admin_id=sender_admin_id,
            title=title,
            content=content,
            target_type=target_type,
            target_value=target_value,
            channels=["INBOX"],
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg

    @staticmethod
    def _resolve_user_ids(db: Session, target_type: str, target_value: str | None) -> list[int]:
        if target_type == "ALL":
            return db.execute(select(V2User.id)).scalars().all()
        if target_type in {"SEGMENT", "TAG"} and target_value:
            return (
                db.execute(
                    select(V2UserSegment.user_id).where(V2UserSegment.segment == target_value)
                )
                .scalars()
                .all()
            )
        if target_type == "USER" and target_value:
            ids = []
            for raw in target_value.split(","):
                raw = raw.strip()
                if raw:
                    try:
                        ids.append(int(raw))
                    except ValueError:
                        continue
            return ids
        return []

    @staticmethod
    def fan_out_message(
        db: Session,
        *,
        message_id: int,
        target_type: str,
        target_value: str | None,
        resolved_user_ids: Iterable[int] | None = None,
    ) -> int:
        user_ids = list(resolved_user_ids) if resolved_user_ids is not None else V2AdminMessageService._resolve_user_ids(
            db, target_type, target_value
        )
        if not user_ids:
            return 0

        inbox_items = [V2AdminMessageInbox(user_id=uid, message_id=message_id) for uid in set(user_ids)]
        db.bulk_save_objects(inbox_items)
        msg = db.get(V2AdminMessage, message_id)
        if msg is not None:
            msg.recipient_count = len(inbox_items)
            db.add(msg)
        db.commit()
        return len(inbox_items)
