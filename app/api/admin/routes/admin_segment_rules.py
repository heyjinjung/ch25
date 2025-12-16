"""Admin endpoints for segment rules (DB-managed segmentation)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.admin_segment_rule import (
    AdminSegmentRuleCreateRequest,
    AdminSegmentRuleResponse,
    AdminSegmentRuleUpdateRequest,
)
from app.services.admin_segment_rule_service import AdminSegmentRuleService

router = APIRouter(prefix="/admin/api/segment-rules", tags=["admin", "segment-rules"])


@router.get("", response_model=list[AdminSegmentRuleResponse])
@router.get("/", response_model=list[AdminSegmentRuleResponse])
def list_segment_rules(db: Session = Depends(get_db)) -> list[AdminSegmentRuleResponse]:
    rules = AdminSegmentRuleService.list_rules(db)
    return [AdminSegmentRuleResponse.model_validate(r) for r in rules]


@router.post("", response_model=AdminSegmentRuleResponse)
@router.post("/", response_model=AdminSegmentRuleResponse)
def create_segment_rule(
    payload: AdminSegmentRuleCreateRequest,
    db: Session = Depends(get_db),
) -> AdminSegmentRuleResponse:
    try:
        rule = AdminSegmentRuleService.create_rule(db, payload=payload)
        return AdminSegmentRuleResponse.model_validate(rule)
    except IntegrityError as exc:
        raise HTTPException(status_code=409, detail="SEGMENT_RULE_NAME_EXISTS") from exc


@router.put("/{rule_id}", response_model=AdminSegmentRuleResponse)
def update_segment_rule(
    rule_id: int,
    payload: AdminSegmentRuleUpdateRequest,
    db: Session = Depends(get_db),
) -> AdminSegmentRuleResponse:
    try:
        rule = AdminSegmentRuleService.update_rule(db, rule_id=rule_id, payload=payload)
        return AdminSegmentRuleResponse.model_validate(rule)
    except ValueError as exc:
        if str(exc) == "RULE_NOT_FOUND":
            raise HTTPException(status_code=404, detail="SEGMENT_RULE_NOT_FOUND") from exc
        raise
    except IntegrityError as exc:
        raise HTTPException(status_code=409, detail="SEGMENT_RULE_NAME_EXISTS") from exc


@router.delete("/{rule_id}")
def delete_segment_rule(rule_id: int, db: Session = Depends(get_db)) -> dict:
    try:
        AdminSegmentRuleService.delete_rule(db, rule_id=rule_id)
        return {"ok": True}
    except ValueError as exc:
        if str(exc) == "RULE_NOT_FOUND":
            raise HTTPException(status_code=404, detail="SEGMENT_RULE_NOT_FOUND") from exc
        raise
