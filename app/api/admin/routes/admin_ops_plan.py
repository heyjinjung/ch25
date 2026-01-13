"""Admin ops plan (playbook) endpoints.

MVP:
- 캠페인/플랜/작업(Task) CRUD
- execute는 ops_log 연동 없이 task executed_at/status만 업데이트
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_id, get_db
from app.schemas.ops_plan import (
    OpsCampaignCreate,
    OpsCampaignOut,
    OpsCampaignUpdate,
    OpsPlanCreate,
    OpsPlanOut,
    OpsPlanTaskCreate,
    OpsPlanTaskExecuteRequest,
    OpsPlanTaskOut,
    OpsPlanTaskUpdate,
    OpsPlanUpdate,
)
from app.services.ops_plan_service import OpsPlanService

router = APIRouter(prefix="/admin/api/ops", tags=["admin-ops-plan"])
service = OpsPlanService()


@router.post("/campaigns", response_model=OpsCampaignOut, status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: OpsCampaignCreate,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    data = payload.model_dump()
    if data.get("owner_admin_id") is None:
        data["owner_admin_id"] = admin_id
    return service.create_campaign(db, payload=data)


@router.get("/campaigns", response_model=list[OpsCampaignOut])
def list_campaigns(
    status: str | None = None,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    return service.list_campaigns(db, status=status)


@router.get("/campaigns/{campaign_id}", response_model=OpsCampaignOut)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    return service.get_campaign(db, campaign_id=campaign_id)


@router.patch("/campaigns/{campaign_id}", response_model=OpsCampaignOut)
def update_campaign(
    campaign_id: int,
    payload: OpsCampaignUpdate,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    return service.update_campaign(db, campaign_id=campaign_id, patch=patch)


@router.post("/plans", response_model=OpsPlanOut)
def create_or_get_plan(
    payload: OpsPlanCreate,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    return service.ensure_plan(db, campaign_id=payload.campaign_id, plan_date=payload.plan_date)


@router.get("/plans", response_model=list[OpsPlanOut])
def list_plans(
    campaign_id: int,
    date: date | None = None,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    return service.list_plans(db, campaign_id=campaign_id, plan_date=date)


@router.get("/plans/{plan_id}", response_model=OpsPlanOut)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    return service.get_plan(db, plan_id=plan_id)


@router.patch("/plans/{plan_id}", response_model=OpsPlanOut)
def update_plan(
    plan_id: int,
    payload: OpsPlanUpdate,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    return service.update_plan(db, plan_id=plan_id, patch=patch)


@router.post("/plans/{plan_id}/tasks", response_model=OpsPlanTaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    plan_id: int,
    payload: OpsPlanTaskCreate,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    data = payload.model_dump()
    return service.create_task(db, plan_id=plan_id, payload=data, actor_admin_id=admin_id)


@router.get("/plans/{plan_id}/tasks", response_model=list[OpsPlanTaskOut])
def list_tasks(
    plan_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    return service.list_tasks(db, plan_id=plan_id)


@router.patch("/tasks/{task_id}", response_model=OpsPlanTaskOut)
def update_task(
    task_id: int,
    payload: OpsPlanTaskUpdate,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    return service.update_task(db, task_id=task_id, patch=patch, actor_admin_id=admin_id)


@router.post("/tasks/{task_id}/execute", response_model=OpsPlanTaskOut)
def execute_task(
    task_id: int,
    payload: OpsPlanTaskExecuteRequest,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    return service.execute_task(db, task_id=task_id, status_value=payload.status, actor_admin_id=admin_id)


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    service.delete_plan(db, plan_id=plan_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    service.delete_task(db, task_id=task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
