from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.v2.schemas.v2_admin_segment_rule import (
    AdminSegmentRuleCreateRequest,
    AdminSegmentRuleUpdateRequest,
)
from app.v2.services import V2SegmentService
from app.v2.middleware.admin_audit import log_admin_action
from app.models.user_segment import UserSegment
from app.v2.models.user import V2User
from app.v2.models.hq_prospective_user import HQProspectiveUser

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
            "name": "NEW",
            "label": "신규(7일)",
            "count": segment_data.get("NEW", 0),
            "color": "text-rose-400",
            "bg": "bg-rose-500/10",
            "border": "border-rose-500/20",
            "desc": "가입 7일 이내/텔레그램 인증",
        },
        {
            "name": "COMMON",
            "label": "일반",
            "count": segment_data.get("COMMON", 0),
            "color": "text-zinc-300",
            "bg": "bg-zinc-500/10",
            "border": "border-zinc-500/20",
            "desc": "기본 세그먼트(일반 유저)",
        },
        {
            "name": "VIP",
            "label": "VIP",
            "count": segment_data.get("VIP", 0),
            "color": "text-blue-400",
            "bg": "bg-blue-500/10",
            "border": "border-blue-500/20",
            "desc": "최근 7일 입금 50만+",
        },
        {
            "name": "WHALE",
            "label": "고액(Whale)",
            "count": segment_data.get("WHALE", 0),
            "color": "text-purple-400",
            "bg": "bg-purple-500/10",
            "border": "border-purple-500/20",
            "desc": "최근 7일 입금 300만+",
        },
        {
            "name": "AT_RISK",
            "label": "이탈 위험",
            "count": segment_data.get("AT_RISK", 0),
            "color": "text-amber-400",
            "bg": "bg-amber-500/10",
            "border": "border-amber-500/20",
            "desc": "최근 활동 7일 이상",
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


@router.get("/segments/{segment}/users")
def get_segment_users(
    segment: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """특정 세그먼트에 속한 유저 목록을 반환합니다."""
    offset = (page - 1) * limit
    
    # 유효한 세그먼트 확인
    valid_segments = {"NEW", "COMMON", "VIP", "WHALE", "AT_RISK"}
    segment_upper = segment.upper()
    if segment_upper not in valid_segments:
        return {"users": [], "total": 0, "page": page, "limit": limit}
    
    # UserSegment + V2User 조인
    query = (
        db.query(UserSegment, V2User, HQProspectiveUser)
        .join(V2User, UserSegment.user_id == V2User.id)
        .outerjoin(
            HQProspectiveUser,
            (HQProspectiveUser.matched_user_id == V2User.id)
        )
        .filter(UserSegment.segment == segment_upper)
    )
    
    total = query.count()
    rows = query.order_by(UserSegment.updated_at.desc()).offset(offset).limit(limit).all()
    
    users = []
    for seg, user, prospect in rows:
        users.append({
            "userId": user.id,
            "nickname": user.nickname,
            "segment": seg.segment,
            "lastActivityAt": user.last_activity_at.isoformat() if user.last_activity_at else None,
            "totalMargin": prospect.total_margin if prospect else 0,
            "totalCharge": prospect.total_charge if prospect else 0,
            "createdAt": user.created_at.isoformat() if user.created_at else None,
        })
    
    return {
        "users": users,
        "total": total,
        "page": page,
        "limit": limit,
    }
