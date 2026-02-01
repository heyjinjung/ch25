"""Service layer for V2 Admin ops plan (playbook) module."""
from __future__ import annotations

from datetime import datetime, date
from typing import Any, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.v2.models import OpsCampaign, OpsPlan, OpsPlanTask
from app.v2.models.user import V2User
from app.v2.services.admin_inventory_service import V2AdminInventoryService
from app.v2.services.v2_admin_ops_log_service import V2AdminOpsLogService
from app.v2.services.vault2_service import Vault2Service


class V2AdminOpsPlanService:
    @staticmethod
    def create_campaign(db: Session, *, payload: dict) -> OpsCampaign:
        campaign = OpsCampaign(**payload)
        db.add(campaign)
        db.flush()
        return campaign

    @staticmethod
    def list_campaigns(db: Session, *, status_filter: str | None = None) -> list[OpsCampaign]:
        q = select(OpsCampaign)
        if status_filter:
            q = q.where(OpsCampaign.status == status_filter)
        q = q.order_by(OpsCampaign.id.desc())
        return list(db.execute(q).scalars().all())

    @staticmethod
    def get_campaign(db: Session, campaign_id: int) -> OpsCampaign:
        campaign = db.get(OpsCampaign, campaign_id)
        if not campaign:
            raise HTTPException(status_code=404, detail="OPS_CAMPAIGN_NOT_FOUND")
        return campaign

    @staticmethod
    def update_campaign(db: Session, campaign_id: int, patch: dict) -> OpsCampaign:
        campaign = V2AdminOpsPlanService.get_campaign(db, campaign_id)
        for k, v in patch.items():
            setattr(campaign, k, v)
        db.add(campaign)
        db.flush()
        return campaign

    @staticmethod
    def ensure_plan(db: Session, campaign_id: int, plan_date: date) -> OpsPlan:
        existing = db.execute(
            select(OpsPlan).where(OpsPlan.campaign_id == campaign_id).where(OpsPlan.plan_date == plan_date)
        ).scalar_one_or_none()
        if existing:
            return existing
        plan = OpsPlan(campaign_id=campaign_id, plan_date=plan_date, status="DRAFT")
        db.add(plan)
        db.flush()
        return plan

    @staticmethod
    def get_plan(db: Session, plan_id: int) -> OpsPlan:
        plan = db.get(OpsPlan, plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="OPS_PLAN_NOT_FOUND")
        return plan

    @staticmethod
    def list_plans(db: Session, campaign_id: int, plan_date: date | None = None) -> list[OpsPlan]:
        q = select(OpsPlan).where(OpsPlan.campaign_id == campaign_id)
        if plan_date:
            q = q.where(OpsPlan.plan_date == plan_date)
        q = q.order_by(OpsPlan.plan_date.desc(), OpsPlan.id.desc())
        return list(db.execute(q).scalars().all())

    @staticmethod
    def update_plan(db: Session, plan_id: int, patch: dict) -> OpsPlan:
        plan = V2AdminOpsPlanService.get_plan(db, plan_id)
        for k, v in patch.items():
            setattr(plan, k, v)
        db.add(plan)
        db.flush()
        return plan

    @staticmethod
    def create_task(db: Session, plan_id: int, payload: dict, actor_admin_id: int | None) -> OpsPlanTask:
        task = OpsPlanTask(plan_id=plan_id, actor_admin_id=actor_admin_id, **payload)
        db.add(task)
        db.flush()
        return task

    @staticmethod
    def list_tasks(db: Session, plan_id: int) -> list[OpsPlanTask]:
        q = select(OpsPlanTask).where(OpsPlanTask.plan_id == plan_id).order_by(OpsPlanTask.id.asc())
        return list(db.execute(q).scalars().all())

    @staticmethod
    def get_task(db: Session, task_id: int) -> OpsPlanTask:
        task = db.get(OpsPlanTask, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="OPS_TASK_NOT_FOUND")
        return task

    @staticmethod
    def update_task(db: Session, task_id: int, patch: dict, actor_admin_id: int | None = None) -> OpsPlanTask:
        task = V2AdminOpsPlanService.get_task(db, task_id)
        for k, v in patch.items():
            setattr(task, k, v)
        if actor_admin_id is not None:
            task.actor_admin_id = actor_admin_id
        db.add(task)
        db.flush()
        return task

    @staticmethod
    def execute_task(db: Session, task_id: int, status_value: str, actor_admin_id: int) -> OpsPlanTask:
        task = V2AdminOpsPlanService.get_task(db, task_id)
        if task.executed_at:
            raise HTTPException(status_code=409, detail="OPS_TASK_ALREADY_EXECUTED")

        task.executed_at = datetime.utcnow()
        task.status = status_value
        task.actor_admin_id = actor_admin_id
        db.add(task)
        db.flush()
        
        # In a real system, we would trigger backgrounds tasks here based on kind.
        # For now, we align with the MVP logic of just marking as executed.
        
        return task

    @staticmethod
    def delete_plan(db: Session, plan_id: int) -> None:
        plan = V2AdminOpsPlanService.get_plan(db, plan_id)
        db.delete(plan)
        db.flush()

    @staticmethod
    def delete_task(db: Session, task_id: int) -> None:
        task = V2AdminOpsPlanService.get_task(db, task_id)
        db.delete(task)
        db.flush()
