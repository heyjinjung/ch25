"""V2 ops log service (minimal, v2-only import surface)."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.v2.models import OpsDailyLog, OpsLogEntry


class OpsLogService:
    @staticmethod
    def ensure_daily_log(db: Session, log_date: date) -> OpsDailyLog:
        daily = db.get(OpsDailyLog, log_date)
        if daily:
            return daily
        daily = OpsDailyLog(date=log_date, status="DRAFT")
        db.add(daily)
        db.commit()
        db.refresh(daily)
        return daily

    @staticmethod
    def create_log_entry(
        db: Session,
        *,
        log_date: date,
        category: str,
        action_code: str,
        target_model: str,
        target_id: Optional[str],
        meta_data: Dict[str, Any],
        is_automated: bool,
        actor_id: int,
        ref_id: Optional[str],
    ) -> Tuple[OpsLogEntry, bool]:
        if ref_id:
            existing = db.execute(select(OpsLogEntry).where(OpsLogEntry.ref_id == ref_id)).scalar_one_or_none()
            if existing:
                return existing, False

        OpsLogService.ensure_daily_log(db, log_date)

        entry = OpsLogEntry(
            daily_log_date=log_date,
            timestamp=datetime.utcnow(),
            category=category,
            action_code=action_code,
            target_model=target_model,
            target_id=target_id,
            meta_data=meta_data or {},
            is_automated=is_automated,
            actor_id=actor_id,
            ref_id=ref_id,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry, True
