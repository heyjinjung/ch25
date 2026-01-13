"""Service layer for ops plan (playbook) module."""

from __future__ import annotations

from datetime import datetime, date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.ops_plan import OpsCampaign, OpsPlan, OpsPlanTask
from app.models.user import User
from app.services.inventory_service import InventoryService


class OpsPlanService:
    def __init__(self) -> None:
        self.now = datetime.utcnow

    def _execute_inventory_grant_all(self, db: Session, *, task: OpsPlanTask) -> dict:
        payload = (task.payload_json or {}) if isinstance(task.payload_json, dict) else {}

        raw_items = payload.get("items")
        if not isinstance(raw_items, list) or not raw_items:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="OPS_GRANT_ALL_ITEMS_REQUIRED")

        reason = str(payload.get("reason") or "OPS_PLAN_GRANT_ALL").strip() or "OPS_PLAN_GRANT_ALL"

        cleaned_items: list[dict] = []
        for it in raw_items:
            if not isinstance(it, dict):
                continue
            item_type = str(it.get("item_type") or "").strip()
            try:
                amount = int(it.get("amount") or 0)
            except Exception:
                amount = 0
            if not item_type or amount <= 0:
                continue
            cleaned_items.append({"item_type": item_type, "amount": amount})

        if not cleaned_items:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="OPS_GRANT_ALL_ITEMS_INVALID")

        user_ids = list(db.execute(select(User.id).order_by(User.id.asc())).scalars().all())

        granted_users = 0
        related_id = f"ops_plan_task:{task.id}"

        chunk_size = 500
        for i in range(0, len(user_ids), chunk_size):
            chunk = user_ids[i : i + chunk_size]
            for user_id in chunk:
                for it in cleaned_items:
                    InventoryService.grant_item(
                        db,
                        user_id=int(user_id),
                        item_type=str(it["item_type"]),
                        amount=int(it["amount"]),
                        reason=reason,
                        related_id=related_id,
                        auto_commit=False,
                    )
                granted_users += 1
            db.commit()

        return {
            "kind": "INVENTORY_GRANT_ALL",
            "reason": reason,
            "items": cleaned_items,
            "target": "ALL_USERS",
            "granted_users": granted_users,
        }

    # Campaign
    def create_campaign(self, db: Session, *, payload: dict) -> OpsCampaign:
        campaign = OpsCampaign(**payload)
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        return campaign

    def list_campaigns(self, db: Session, *, status: str | None = None) -> list[OpsCampaign]:
        q = select(OpsCampaign)
        if status:
            q = q.where(OpsCampaign.status == status)
        q = q.order_by(OpsCampaign.id.desc())
        return list(db.execute(q).scalars().all())

    def get_campaign(self, db: Session, *, campaign_id: int) -> OpsCampaign:
        campaign = db.get(OpsCampaign, campaign_id)
        if not campaign:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OPS_CAMPAIGN_NOT_FOUND")
        return campaign

    def update_campaign(self, db: Session, *, campaign_id: int, patch: dict) -> OpsCampaign:
        campaign = self.get_campaign(db, campaign_id=campaign_id)
        for k, v in patch.items():
            setattr(campaign, k, v)
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        return campaign

    # Plan
    def ensure_plan(self, db: Session, *, campaign_id: int, plan_date: date) -> OpsPlan:
        existing = db.execute(
            select(OpsPlan).where(OpsPlan.campaign_id == campaign_id).where(OpsPlan.plan_date == plan_date)
        ).scalar_one_or_none()
        if existing:
            return existing
        plan = OpsPlan(campaign_id=campaign_id, plan_date=plan_date, status="DRAFT")
        db.add(plan)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            # possible race: try fetch once more
            existing = db.execute(
                select(OpsPlan).where(OpsPlan.campaign_id == campaign_id).where(OpsPlan.plan_date == plan_date)
            ).scalar_one_or_none()
            if existing:
                return existing
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="OPS_PLAN_CONFLICT") from exc
        db.refresh(plan)
        return plan

    def get_plan(self, db: Session, *, plan_id: int) -> OpsPlan:
        plan = db.get(OpsPlan, plan_id)
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OPS_PLAN_NOT_FOUND")
        return plan

    def list_plans(self, db: Session, *, campaign_id: int, plan_date: date | None = None) -> list[OpsPlan]:
        q = select(OpsPlan).where(OpsPlan.campaign_id == campaign_id)
        if plan_date:
            q = q.where(OpsPlan.plan_date == plan_date)
        q = q.order_by(OpsPlan.plan_date.desc(), OpsPlan.id.desc())
        return list(db.execute(q).scalars().all())

    def update_plan(self, db: Session, *, plan_id: int, patch: dict) -> OpsPlan:
        plan = self.get_plan(db, plan_id=plan_id)
        for k, v in patch.items():
            setattr(plan, k, v)
        db.add(plan)
        db.commit()
        db.refresh(plan)
        return plan

    # Task
    def create_task(self, db: Session, *, plan_id: int, payload: dict, actor_admin_id: int | None) -> OpsPlanTask:
        _ = self.get_plan(db, plan_id=plan_id)
        task = OpsPlanTask(plan_id=plan_id, actor_admin_id=actor_admin_id, **payload)
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    def list_tasks(self, db: Session, *, plan_id: int) -> list[OpsPlanTask]:
        _ = self.get_plan(db, plan_id=plan_id)
        q = select(OpsPlanTask).where(OpsPlanTask.plan_id == plan_id).order_by(OpsPlanTask.id.asc())
        return list(db.execute(q).scalars().all())

    def get_task(self, db: Session, *, task_id: int) -> OpsPlanTask:
        task = db.get(OpsPlanTask, task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OPS_TASK_NOT_FOUND")
        return task

    def update_task(self, db: Session, *, task_id: int, patch: dict, actor_admin_id: int | None) -> OpsPlanTask:
        task = self.get_task(db, task_id=task_id)
        for k, v in patch.items():
            setattr(task, k, v)
        if actor_admin_id is not None:
            task.actor_admin_id = actor_admin_id
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    def execute_task(self, db: Session, *, task_id: int, status_value: str, actor_admin_id: int) -> OpsPlanTask:
        task = self.get_task(db, task_id=task_id)
        if task.executed_at is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="OPS_TASK_ALREADY_EXECUTED")

        payload = (task.payload_json or {}) if isinstance(task.payload_json, dict) else {}
        kind = str(payload.get("kind") or "").strip()

        task.executed_at = self.now()
        task.status = status_value
        task.actor_admin_id = actor_admin_id
        db.add(task)

        # NOTE: For high-risk tasks, we commit the execution marker first to prevent accidental double grants.
        db.commit()
        db.refresh(task)

        if kind == "INVENTORY_GRANT_ALL" and status_value == "DONE":
            try:
                result = self._execute_inventory_grant_all(db, task=task)
                latest_payload = (task.payload_json or {}) if isinstance(task.payload_json, dict) else {}
                task.payload_json = {**latest_payload, "execution_result": result}
                db.add(task)
                db.commit()
                db.refresh(task)
            except Exception as exc:
                db.rollback()
                try:
                    fresh = db.get(OpsPlanTask, task.id)
                    if fresh is not None:
                        latest_payload = (fresh.payload_json or {}) if isinstance(fresh.payload_json, dict) else {}
                        fresh.status = "BLOCKED"
                        fresh.payload_json = {**latest_payload, "execution_error": str(exc)[:500]}
                        db.add(fresh)
                        db.commit()
                        db.refresh(fresh)
                        task = fresh
                except Exception:
                    db.rollback()
                raise
        return task

    def delete_plan(self, db: Session, *, plan_id: int) -> None:
        plan = self.get_plan(db, plan_id=plan_id)
        db.delete(plan)
        db.commit()

    def delete_task(self, db: Session, *, task_id: int) -> None:
        task = self.get_task(db, task_id=task_id)
        db.delete(task)
        db.commit()
