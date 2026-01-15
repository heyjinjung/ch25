"""Admin ops target list (crisis scenarios) endpoints.

Based on spec: docs/06_ops/202601/20260113_ops_crisis_scenarios_spec.md
Provides endpoints for:
- Crisis signal dashboard (11 scenarios)
- Target list import from scenarios
- Result checking for conversion tracking
"""

from __future__ import annotations

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_id, get_db
from app.schemas.ops_target import (
    CrisisSignalOut,
    CrisisSignalsResponse,
    CrisisDetectionRunRequest,
    CrisisDetectionRunResponse,
    OpsTargetImportRequest,
    OpsTargetImportResponse,
    OpsTargetListOut,
    OpsTargetMemberOut,
    OpsTargetResultCheckResponse,
)
from app.services.crisis_detection_service import CrisisDetectionService
from app.services.ops_target_service import OpsTargetService

router = APIRouter(prefix="/admin/api/ops", tags=["admin-ops-target"])
service = OpsTargetService()


# ========== Crisis Signals Endpoints ==========

@router.get("/dashboard/crisis-signals", response_model=CrisisSignalsResponse)
def get_crisis_signals(
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    """Get all 11 crisis scenario counts for dashboard radar."""
    stats = service.get_scenario_stats(db)
    return CrisisSignalsResponse(
        timestamp=datetime.utcnow(),
        signals=[CrisisSignalOut(**s) for s in stats],
    )


@router.post(
    "/plans/{plan_id}/run-crisis-detection",
    response_model=CrisisDetectionRunResponse,
)
def run_crisis_detection(
    plan_id: int,
    payload: CrisisDetectionRunRequest | None = None,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    detector = CrisisDetectionService()
    scenario_ids = payload.scenario_ids if payload else None
    results = detector.run_daily(
        db,
        plan_id=plan_id,
        scenario_ids=scenario_ids,
        actor_admin_id=admin_id,
    )
    return CrisisDetectionRunResponse(
        plan_id=plan_id,
        results=results,
    )


# ========== Target List Endpoints ==========

@router.post(
    "/plans/{plan_id}/import-target",
    response_model=OpsTargetImportResponse,
    status_code=status.HTTP_201_CREATED,
)
def import_target_from_scenario(
    plan_id: int,
    payload: OpsTargetImportRequest,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    """Import users from a scenario into a target list."""
    target_list, count = service.import_from_scenario(
        db,
        plan_id=plan_id,
        scenario_id=payload.scenario_id,
        options=payload.options,
    )
    return OpsTargetImportResponse(
        target_list_id=target_list.id,
        count=count,
        message=f"Imported {count} users from {payload.scenario_id}",
    )


@router.get(
    "/plans/{plan_id}/target-lists",
    response_model=List[OpsTargetListOut],
)
def list_target_lists(
    plan_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    """List all target lists for a plan."""
    return service.list_target_lists(db, plan_id=plan_id)


@router.get(
    "/target-lists/{target_list_id}",
    response_model=OpsTargetListOut,
)
def get_target_list(
    target_list_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    """Get a specific target list."""
    return service.get_target_list(db, target_list_id=target_list_id)


@router.get(
    "/target-lists/{target_list_id}/members",
    response_model=List[OpsTargetMemberOut],
)
def get_target_members(
    target_list_id: int,
    limit: int = Query(default=50, ge=1, le=500, description="Number of members to fetch (sample)"),
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    """Get all members of a target list."""
    return service.get_target_members(db, target_list_id=target_list_id, limit=limit)


# ========== Result Check Endpoints ==========

@router.post(
    "/target-lists/{target_list_id}/check-results",
    response_model=OpsTargetResultCheckResponse,
)
def check_target_results(
    target_list_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    """Check conversion results for a target list."""
    results = service.check_results(db, target_list_id=target_list_id)
    return OpsTargetResultCheckResponse(**results)


@router.delete(
    "/target-lists/{target_list_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_target_list(
    target_list_id: int,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    """Delete a target list and its members."""
    service.delete_target_list(db, target_list_id=target_list_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
