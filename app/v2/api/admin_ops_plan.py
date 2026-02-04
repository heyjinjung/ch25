"""Admin ops plan (playbook) endpoints.

MVP:
- 캠페인/플랜/작업(Task) CRUD
- execute는 ops_log 연동 없이 task executed_at/status만 업데이트
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.v2.api.deps import get_current_admin_id, get_db
from app.v2.models import OpsPlanTask
from app.v2.models import OpsTargetList
from app.v2.models import OpsEvalMetric
from app.v2.schemas.v2_ops_target import OpsTargetListOut
from app.v2.schemas.v2_ops_plan import (
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
    OpsEvalMetricOut,
)
from app.v2.services.v2_admin_ops_plan_service import V2AdminOpsPlanService
from app.v2.models.v2_ops_execution_result import V2OpsExecutionResult
from app.v2.schemas.v2_ops_execution import V2OpsExecutionResultRecord

router = APIRouter(prefix="/admin/api/ops", tags=["admin-ops-plan"])


@router.post("/campaigns", response_model=OpsCampaignOut, status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: OpsCampaignCreate,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    data = payload.model_dump()
    if data.get("owner_admin_id") is None:
        data["owner_admin_id"] = admin_id
    return V2AdminOpsPlanService.create_campaign(db, payload=data)


@router.get("/campaigns", response_model=list[OpsCampaignOut])
def list_campaigns(
    status: str | None = None,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    return V2AdminOpsPlanService.list_campaigns(db, status_filter=status)


@router.get("/campaigns/{campaign_id}", response_model=OpsCampaignOut)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    return V2AdminOpsPlanService.get_campaign(db, campaign_id=campaign_id)


@router.patch("/campaigns/{campaign_id}", response_model=OpsCampaignOut)
def update_campaign(
    campaign_id: int,
    payload: OpsCampaignUpdate,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    return V2AdminOpsPlanService.update_campaign(db, campaign_id=campaign_id, patch=patch)


@router.post("/plans", response_model=OpsPlanOut)
def create_or_get_plan(
    payload: OpsPlanCreate,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    return V2AdminOpsPlanService.ensure_plan(db, campaign_id=payload.campaign_id, plan_date=payload.plan_date)


@router.get("/plans", response_model=list[OpsPlanOut])
def list_plans(
    campaign_id: int,
    date: date | None = None,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    return V2AdminOpsPlanService.list_plans(db, campaign_id=campaign_id, plan_date=date)


@router.get("/plans/{plan_id}", response_model=OpsPlanOut)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    return V2AdminOpsPlanService.get_plan(db, plan_id=plan_id)


@router.patch("/plans/{plan_id}", response_model=OpsPlanOut)
def update_plan(
    plan_id: int,
    payload: OpsPlanUpdate,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    return V2AdminOpsPlanService.update_plan(db, plan_id=plan_id, patch=patch)


@router.post("/plans/{plan_id}/tasks", response_model=OpsPlanTaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    plan_id: int,
    payload: OpsPlanTaskCreate,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    data = payload.model_dump()
    return V2AdminOpsPlanService.create_task(db, plan_id=plan_id, payload=data, actor_admin_id=admin_id)


@router.get("/plans/{plan_id}/tasks", response_model=list[OpsPlanTaskOut])
def list_tasks(
    plan_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    return V2AdminOpsPlanService.list_tasks(db, plan_id=plan_id)


@router.patch("/tasks/{task_id}", response_model=OpsPlanTaskOut)
def update_task(
    task_id: int,
    payload: OpsPlanTaskUpdate,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    return V2AdminOpsPlanService.update_task(db, task_id=task_id, patch=patch, actor_admin_id=admin_id)


@router.post("/tasks/{task_id}/execute", response_model=OpsPlanTaskOut)
def execute_task(
    task_id: int,
    payload: OpsPlanTaskExecuteRequest,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    return V2AdminOpsPlanService.execute_task(db, task_id=task_id, status_value=payload.status, actor_admin_id=admin_id)


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    V2AdminOpsPlanService.delete_plan(db, plan_id=plan_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    V2AdminOpsPlanService.delete_task(db, task_id=task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/plans/{plan_id}/target-lists", response_model=list[OpsTargetListOut])
def list_plan_target_lists(
    plan_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    plan = V2AdminOpsPlanService.get_plan(db, plan_id=plan_id)
    # Only return processed (ready) lists
    return db.scalars(select(OpsTargetList).where(OpsTargetList.plan_id == plan.id).where(OpsTargetList.is_processed == True).order_by(OpsTargetList.id.desc())).all()


@router.get("/items", response_model=list[dict])
def list_item_selector_items(
    _: int = Depends(get_current_admin_id),
):
    # Hardcoded list for MVP as requested
    return [
        {"code": "GEM", "name": "보석", "category": "CURRENCY"},
        {"code": "GOLD", "name": "골드", "category": "CURRENCY"},
        {"code": "CANDY", "name": "캔디", "category": "CURRENCY"},
        {"code": "TICKET_GOLD", "name": "황금 티켓", "category": "TICKET"},
        {"code": "TICKET_SILVER", "name": "실버 티켓", "category": "TICKET"},
        {"code": "TICKET_BRONZE", "name": "브론즈 티켓", "category": "TICKET"},
        {"code": "BOX_KEY_S", "name": "금고 열쇠 S", "category": "ITEM"},
        {"code": "BOX_KEY_A", "name": "금고 열쇠 A", "category": "ITEM"},
    ]


@router.get("/plans/{plan_id}/eval-metrics", response_model=list[OpsEvalMetricOut])
def list_plan_eval_metrics(
    plan_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    return db.scalars(select(OpsEvalMetric).where(OpsEvalMetric.plan_id == plan_id).order_by(OpsEvalMetric.eval_type.asc())).all()


@router.get("/plans/{plan_id}/timeline", response_model=list[OpsPlanTaskOut])
def list_plan_timeline(
    plan_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    # Only executed tasks
    return db.scalars(select(OpsPlanTask).where(OpsPlanTask.plan_id == plan_id).where(OpsPlanTask.executed_at.is_not(None)).order_by(OpsPlanTask.executed_at.desc())).all()


@router.post("/tasks/{task_id}/execution-result")
def save_execution_result(
    task_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    kind = payload.get("kind")
    if not kind:
        raise HTTPException(status_code=400, detail="MISSING_KIND")

    record = V2OpsExecutionResult(task_id=task_id, kind=str(kind), payload_json=payload)
    db.add(record)
    db.commit()
    return {"saved": True}


@router.get("/tasks/{task_id}/execution-result", response_model=V2OpsExecutionResultRecord)
def get_execution_result(
    task_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    record = (
        db.query(V2OpsExecutionResult)
        .filter(V2OpsExecutionResult.task_id == task_id)
        .order_by(V2OpsExecutionResult.id.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="EXECUTION_RESULT_NOT_FOUND")
    return record
