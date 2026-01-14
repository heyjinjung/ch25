"""Crisis detection batch service for ops targeting."""
from __future__ import annotations

from datetime import datetime
from typing import Iterable
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.services.ops_log_service import OpsLogService
from app.services.ops_target_service import OpsTargetService


class CrisisDetectionService:
    """Batch runner for crisis scenario detection and target list creation."""

    def __init__(self) -> None:
        self.ops_target_service = OpsTargetService()
        self.ops_log_service = OpsLogService()

    @staticmethod
    def _log_date_kst(now: datetime) -> datetime.date:
        settings = get_settings()
        tz = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))
        return now.astimezone(tz).date()

    def run_daily(
        self,
        db: Session,
        *,
        plan_id: int,
        scenario_ids: Iterable[str] | None = None,
        actor_admin_id: int = 0,
    ) -> list[dict]:
        """Run detection for Scenario 01/03/05 and create target lists."""
        now = datetime.utcnow()
        log_date = self._log_date_kst(now)
        scenario_list = list(scenario_ids) if scenario_ids else ["SCENARIO_01", "SCENARIO_03", "SCENARIO_05"]
        results: list[dict] = []

        for scenario_id in scenario_list:
            ref_id = f"CRISIS:{scenario_id}:{plan_id}:{log_date.isoformat()}"
            try:
                target_list, count = self.ops_target_service.import_from_scenario(
                    db,
                    plan_id=plan_id,
                    scenario_id=scenario_id,
                    options=None,
                )
                results.append(
                    {
                        "scenario_id": scenario_id,
                        "target_list_id": target_list.id,
                        "count": count,
                        "status": "OK",
                    }
                )

                self.ops_log_service.create_log_entry(
                    db,
                    log_date=log_date,
                    category="OPS",
                    action_code="SEGMENT_QUERY_EXECUTED",
                    target_model="OpsTargetList",
                    target_id=str(target_list.id),
                    meta_data={
                        "scenario_id": scenario_id,
                        "plan_id": plan_id,
                        "count": count,
                        "segment_key": scenario_id,
                        "result_count": count,
                    },
                    is_automated=True,
                    actor_id=actor_admin_id,
                    ref_id=ref_id,
                )
            except Exception as exc:
                results.append(
                    {
                        "scenario_id": scenario_id,
                        "target_list_id": None,
                        "count": 0,
                        "status": "FAILED",
                        "message": str(exc)[:200],
                    }
                )

        return results
