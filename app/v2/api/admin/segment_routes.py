from datetime import datetime

from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.v2.schemas.v2_admin_segment_rule import (
    AdminSegmentRuleCreateRequest,
    AdminSegmentRuleUpdateRequest,
)
from app.v2.services import V2SegmentService
from app.v2.middleware.admin_audit import log_admin_action

router = APIRouter()


@router.post("/segments/batch/run")
def run_segment_batch(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info
    result = V2SegmentService.segment_all_users(db)
    
    # 감사 로그
    log_admin_action(
        db,
        admin_id=admin_id,
        action="SEGMENT_BATCH_RUN",
        target_type="segment",
        after={"result": str(result)[:500] if result else None},
    )
    
    return result


@router.get("/segments/stats")
def get_segment_stats(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    stats = V2SegmentService.get_overall_stats(db)

    segment_data = stats.get("segments", {})

    segments_list = [
        {
            "name": "DAILY",
            "label": "Daily Active",
            "count": segment_data.get("DAILY", 0),
            "color": "text-green-500",
            "bg": "bg-green-500/10",
            "border": "border-green-500/20",
            "desc": "Users active in the last 24 hours",
        },
        {
            "name": "WEEKLY",
            "label": "Weekly Active",
            "count": segment_data.get("WEEKLY", 0),
            "color": "text-blue-500",
            "bg": "bg-blue-500/10",
            "border": "border-blue-500/20",
            "desc": "Users active in the last 7 days (excluding last 24h)",
        },
        {
            "name": "MONTHLY",
            "label": "Monthly Active",
            "count": segment_data.get("MONTHLY", 0),
            "color": "text-yellow-500",
            "bg": "bg-yellow-500/10",
            "border": "border-yellow-500/20",
            "desc": "Users active in the last 30 days (excluding last 7d)",
        },
        {
            "name": "DORMANT",
            "label": "Dormant",
            "count": segment_data.get("DORMANT", 0),
            "color": "text-zinc-500",
            "bg": "bg-zinc-500/10",
            "border": "border-zinc-500/20",
            "desc": "Users inactive for more than 30 days",
        },
    ]

    return {
        "segments": segments_list,
        "lastBatchTime": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
    }


@router.get("/segments/rules")
def list_segment_rules(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    rules = V2SegmentService.list_rules(db)

    result = []
    for r in rules:
        rule_str = r.name
        if r.condition_json and "raw_rule" in r.condition_json:
            rule_str = r.condition_json["raw_rule"]
        elif r.condition_json:
            rule_str = str(r.condition_json)

        result.append(
            {
                "id": r.id,
                "label": r.name,
                "rule": rule_str,
                "targetSegment": r.segment,
                "status": "Active" if r.enabled else "Inactive",
                "description": r.name,
            }
        )
    return result


@router.post("/segments/rules", status_code=201)
def create_segment_rule_endpoint(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    name = payload.get("label")
    segment = payload.get("targetSegment")
    raw_rule = payload.get("rule")

    condition_json = {"raw_rule": raw_rule}

    rule_req = AdminSegmentRuleCreateRequest(
        name=name,
        segment=segment,
        priority=100,
        condition_json=condition_json,
        enabled=True,
    )

    rule = V2SegmentService.create_rule(db, payload=rule_req)
    
    # 감사 로그
    log_admin_action(
        db,
        admin_id=admin_id,
        action="SEGMENT_RULE_CREATE",
        target_type="segment_rule",
        target_id=str(rule.id),
        after={"name": name, "segment": segment, "rule": raw_rule},
    )
    
    return {"id": rule.id, "message": "created"}


@router.put("/segments/rules/{rule_id}")
def update_segment_rule_endpoint(
    rule_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info
    
    update_data = {}
    if "label" in payload:
        update_data["name"] = payload["label"]
    if "targetSegment" in payload:
        update_data["segment"] = payload["targetSegment"]
    if "rule" in payload:
        update_data["condition_json"] = {"raw_rule": payload["rule"]}
    if "status" in payload:
        update_data["enabled"] = payload["status"] == "Active"

    update_req = AdminSegmentRuleUpdateRequest(**update_data)
    rule = V2SegmentService.update_rule(db, rule_id=rule_id, payload=update_req)
    
    # 감사 로그
    log_admin_action(
        db,
        admin_id=admin_id,
        action="SEGMENT_RULE_UPDATE",
        target_type="segment_rule",
        target_id=str(rule_id),
        after=update_data,
    )
    
    return {"id": rule.id, "message": "updated"}


@router.delete("/segments/rules/{rule_id}")
def delete_segment_rule_endpoint(
    rule_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info
    
    V2SegmentService.delete_rule(db, rule_id=rule_id)
    
    # 감사 로그
    log_admin_action(
        db,
        admin_id=admin_id,
        action="SEGMENT_RULE_DELETE",
        target_type="segment_rule",
        target_id=str(rule_id),
    )
    
    return {"message": "deleted"}
