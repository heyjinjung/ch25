"""Service for evaluating Ops Plan performance metrics (D+1, D+3, D+7)."""

from datetime import date, datetime, timedelta
from typing import Any, Dict, List

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.ops_eval_metric import OpsEvalMetric
from app.models.ops_log import OpsLogEntry
from app.models.ops_plan import OpsPlan, OpsPlanTask
from app.models.ops_target import OpsTargetList, OpsTargetMember
from app.models.user_activity_event import UserActivityEvent


class OpsPlanAnalysisWorker:
    """Worker logic to calculate and persist evaluation metrics."""

    def __init__(self, db: Session):
        self.db = db

    def run_daily_analysis(self, target_date: date) -> List[OpsEvalMetric]:
        """Run analysis for a specific date (usually yesterday)."""
        metrics = []

        # 1. D+1 Analysis (Response)
        d1_target_date = target_date - timedelta(days=1)
        d1_plans = self._get_executed_plans(d1_target_date)
        for plan in d1_plans:
            metric = self._analyze_plan_d1_response(plan)
            if metric:
                metrics.append(metric)

        # 2. D+3 Analysis (Effectiveness)
        d3_target_date = target_date - timedelta(days=3)
        d3_plans = self._get_executed_plans(d3_target_date)
        for plan in d3_plans:
            metric = self._analyze_plan_d3_effectiveness(plan)
            if metric:
                metrics.append(metric)

        # 3. D+7 Analysis (Soundness/Health)
        d7_target_date = target_date - timedelta(days=7)
        d7_plans = self._get_executed_plans(d7_target_date)
        for plan in d7_plans:
            metric = self._analyze_plan_d7_soundness(plan)
            if metric:
                metrics.append(metric)
        
        return metrics

    def _get_executed_plans(self, plan_date: date) -> List[OpsPlan]:
        """Fetch plans executed on a specific date."""
        stmt = select(OpsPlan).where(OpsPlan.plan_date == plan_date, OpsPlan.status == "ACTIVE") # Assuming executed plans are ACTIVE or DONE
        return list(self.db.execute(stmt).scalars().all())

    def _upsert_metric(self, plan_id: int, eval_type: str, data: Dict[str, Any], grade: str = "B") -> OpsEvalMetric:
        """Save or update metric result."""
        existing = self.db.execute(
            select(OpsEvalMetric).where(
                OpsEvalMetric.plan_id == plan_id,
                OpsEvalMetric.eval_type == eval_type
            )
        ).scalar_one_or_none()

        if existing:
            existing.metrics_json = data
            existing.grade = grade
            existing.created_at = datetime.utcnow() # Update timestamp
            self.db.add(existing)
            return existing
        else:
            new_metric = OpsEvalMetric(
                plan_id=plan_id,
                eval_type=eval_type,
                metrics_json=data,
                grade=grade,
                created_at=datetime.utcnow()
            )
            self.db.add(new_metric)
            self.db.commit() # Commit new record
            self.db.refresh(new_metric)
            return new_metric

    def _analyze_plan_d1_response(self, plan: OpsPlan) -> OpsEvalMetric | None:
        """Calculate D+1 Response metrics (Claim Rate, Error Rate)."""
        # 1. Identify Target List
        tasks = self.db.execute(select(OpsPlanTask).where(OpsPlanTask.plan_id == plan.id)).scalars().all()
        target_list_ids = set()
        for task in tasks:
             payload = (task.payload_json or {}) if isinstance(task.payload_json, dict) else {}
             if "target_list_id" in payload:
                 target_list_ids.add(int(payload["target_list_id"]))

        if not target_list_ids:
            return None # No specific target list to analyze

        total_target_count = 0
        total_claimed_count = 0 
        
        # Simplified logic: Check Inventory Grant logs or OpsTargetMember status
        # For now, let's look at OpsTargetMember status if available
        for list_id in target_list_ids:
            # Check target list members
            stmt = select(func.count(OpsTargetMember.id)).where(OpsTargetMember.target_list_id == list_id)
            list_count = self.db.execute(stmt).scalar() or 0
            total_target_count += list_count

            # TODO: Better claim tracking. For now, assume SENT means claimed/delivered for DM type tasks
            # For strict claim rate, we need to join with Inventory Logs
            stmt_sent = select(func.count(OpsTargetMember.id)).where(
                OpsTargetMember.target_list_id == list_id, 
                OpsTargetMember.status == "SENT"
            )
            sent_count = self.db.execute(stmt_sent).scalar() or 0
            total_claimed_count += sent_count

        claim_rate = (total_claimed_count / total_target_count) if total_target_count > 0 else 0.0
        
        # Determine Grade
        grade = "B"
        if claim_rate >= 0.8:
            grade = "A"
        elif claim_rate < 0.5:
            grade = "C"

        metrics = {
            "target_count": total_target_count,
            "claim_count": total_claimed_count,
            "claim_rate": round(claim_rate, 2),
            "error_count": 0 # Placeholder for error log counting
        }

        return self._upsert_metric(plan.id, "D1", metrics, grade)

    def _analyze_plan_d3_effectiveness(self, plan: OpsPlan) -> OpsEvalMetric | None:
        """Calculate D+3 Effectiveness metrics (Retention)."""
        # Logic: Find users targeted by this plan, check if they logged in on D+3
        tasks = self.db.execute(select(OpsPlanTask).where(OpsPlanTask.plan_id == plan.id)).scalars().all()
        target_list_ids = set()
        for task in tasks:
             payload = (task.payload_json or {}) if isinstance(task.payload_json, dict) else {}
             if "target_list_id" in payload:
                 target_list_ids.add(int(payload["target_list_id"]))
        
        if not target_list_ids:
            return None

        retention_target_date = plan.plan_date + timedelta(days=3)
        total_target_users = 0
        retained_users = 0

        for list_id in target_list_ids:
             # Get user IDs from target list
             member_subquery = select(OpsTargetMember.user_id).where(OpsTargetMember.target_list_id == list_id)
             
             # Count users who have activity on D+3
             # Note: Using UserActivityEvent for precise activity tracking
             activity_stmt = select(func.count(func.distinct(UserActivityEvent.user_id))).where(
                 UserActivityEvent.user_id.in_(member_subquery),
                 func.date(UserActivityEvent.created_at) == retention_target_date
             )
             retained = self.db.execute(activity_stmt).scalar() or 0
             retained_users += retained
             
             # Total count
             count_stmt = select(func.count(OpsTargetMember.id)).where(OpsTargetMember.target_list_id == list_id)
             total_target_users += (self.db.execute(count_stmt).scalar() or 0)

        retention_rate = (retained_users / total_target_users) if total_target_users > 0 else 0.0

        grade = "B"
        if retention_rate > 0.4: # Example threshold
            grade = "A"
        elif retention_rate < 0.2:
            grade = "C"

        metrics = {
            "target_users": total_target_users,
            "retained_users": retained_users,
            "retention_rate": round(retention_rate, 2),
            "lift": 0.0 # Placeholder for lift vs control group
        }

        return self._upsert_metric(plan.id, "D3", metrics, grade)

    def _analyze_plan_d7_soundness(self, plan: OpsPlan) -> OpsEvalMetric | None:
        """Calculate D+7 Soundness metrics (Economy balance)."""
        # Placeholder logic: Look for significant wallet balance changes
        # For MVP, we'll return a basic structure
        metrics = {
             "inflation_rate": 0.0,
             "burn_rate": 0.0
        }
        return self._upsert_metric(plan.id, "D7", metrics, "B")
