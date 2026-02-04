"""V2 Service for Admin Mission & Streak Management."""
from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.v2.models import Mission, MissionRewardType
from app.v2.models import UserEventLog

logger = logging.getLogger(__name__)

class V2AdminMissionService:
    @staticmethod
    def list_missions(db: Session) -> List[Mission]:
        return db.query(Mission).order_by(Mission.id).all()

    @staticmethod
    def get_mission(db: Session, mission_id: int) -> Mission:
        m = db.get(Mission, mission_id)
        if not m:
            raise HTTPException(status_code=404, detail="MISSION_NOT_FOUND")
        return m

    @staticmethod
    def create_mission(db: Session, payload: dict) -> Mission:
        # Action type logic
        if "logic_key" in payload and "action_type" not in payload:
            payload["action_type"] = payload["logic_key"]
            
        mission = Mission(**payload)
        db.add(mission)
        db.commit()
        db.refresh(mission)
        return mission

    @staticmethod
    def update_mission(db: Session, mission_id: int, patch: dict) -> Mission:
        mission = V2AdminMissionService.get_mission(db, mission_id)
        for k, v in patch.items():
            setattr(mission, k, v)
            if k == "logic_key":
                mission.action_type = v
        db.add(mission)
        db.commit()
        db.refresh(mission)
        return mission

    @staticmethod
    def delete_mission(db: Session, mission_id: int) -> None:
        mission = V2AdminMissionService.get_mission(db, mission_id)
        db.delete(mission)
        db.commit()

    @staticmethod
    def count_streak_events(db: Session, event_name: str) -> int:
        return int(
            db.query(func.count())
            .select_from(UserEventLog)
            .filter(
                UserEventLog.feature_type == "STREAK",
                UserEventLog.event_name == event_name,
            )
            .scalar()
            or 0
        )
