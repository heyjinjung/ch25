"""Admin Prospect Linking Routes - 잠재 유저 매칭 대시보드 API."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.v2.services.prospect_linking_service import ProspectLinkingService

router = APIRouter()


# ==================== Request/Response Schemas ====================

class ProspectLinkRequest(BaseModel):
    """잠재 유저 연결 요청."""
    user_id: int = Field(..., description="연결할 V2User ID")


class ProspectIgnoreRequest(BaseModel):
    """잠재 유저 무시 요청."""
    reason: Optional[str] = Field(None, description="무시 사유", max_length=200)


class UserSearchRequest(BaseModel):
    """유저 검색 요청."""
    query: str = Field(..., description="검색어 (닉네임)", min_length=1)


# ==================== Routes ====================

@router.get("/prospects")
def list_unlinked_prospects(
    segment: Optional[str] = Query(None, description="세그먼트 필터 (VIP, WHALE, AT_RISK)"),
    include_ignored: bool = Query(False, description="무시된 항목 포함 여부"),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    연결되지 않은 잠재 유저 목록 조회 (유사 V2User 추천 포함).
    
    Response:
    ```json
    {
        "total": 125,
        "prospects": [
            {
                "id": 1,
                "nickname": "큰손고래123",
                "segment": "WHALE",
                "total_margin": 5000000,
                "suggestions": [
                    {"user_id": 42, "nickname": "큰손고래", "similarity": 92.0}
                ]
            }
        ]
    }
    ```
    """
    admin_id, admin_role = admin_info
    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")
    
    service = ProspectLinkingService(db)
    return service.get_unlinked_prospects(
        segment_filter=segment,
        include_ignored=include_ignored,
        limit=limit,
        offset=offset
    )


@router.post("/prospects/{prospect_id}/link")
def link_prospect_to_user(
    prospect_id: int,
    request: ProspectLinkRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    Admin이 잠재 유저를 V2User와 수동 연결.
    
    - 잠재 유저의 세그먼트(VIP/WHALE)가 V2User에 즉시 적용됨
    - V2UserSegment 테이블도 함께 업데이트
    """
    admin_id, admin_role = admin_info
    if admin_role not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")
    
    service = ProspectLinkingService(db)
    result = service.admin_link_prospect(
        prospect_id=prospect_id,
        user_id=request.user_id,
        admin_id=admin_id
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.post("/prospects/{prospect_id}/ignore")
def ignore_prospect(
    prospect_id: int,
    request: ProspectIgnoreRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    Admin이 잠재 유저를 무시 처리.
    
    - 목록에서 제외됨 (include_ignored=True로 조회 가능)
    - 추후 복원 가능
    """
    admin_id, admin_role = admin_info
    if admin_role not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")
    
    service = ProspectLinkingService(db)
    result = service.admin_ignore_prospect(
        prospect_id=prospect_id,
        admin_id=admin_id,
        reason=request.reason
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.get("/prospects/stats")
def get_prospect_stats(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    잠재 유저 연동 현황 통계.
    
    Response:
    ```json
    {
        "total_prospects": 500,
        "linked": 120,
        "ignored": 30,
        "pending": 350,
        "link_rate": 24.0,
        "by_segment": {
            "VIP": {"total": 200, "linked": 80, "pending": 120},
            "WHALE": {"total": 50, "linked": 20, "pending": 30}
        }
    }
    ```
    """
    admin_id, admin_role = admin_info
    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")
    
    service = ProspectLinkingService(db)
    return service.get_linking_stats()


@router.get("/users/search")
def search_users_for_linking(
    q: str = Query(..., description="검색어 (닉네임)", min_length=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    연결용 V2User 검색.
    
    - 아직 외부 계정과 연동되지 않은 유저만 반환
    - 닉네임 부분 일치 검색
    """
    from sqlalchemy import func
    from app.v2.models.user import V2User
    
    admin_id, admin_role = admin_info
    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")
    
    users = db.query(V2User).filter(
        V2User.external_nickname.is_(None),
        func.lower(V2User.nickname).contains(q.lower())
    ).limit(limit).all()
    
    return {
        "total": len(users),
        "users": [
            {
                "id": u.id,
                "nickname": u.nickname,
                "telegram_username": u.telegram_username,
                "telegram_id": u.telegram_id,
                "total_charge_amount": u.total_charge_amount,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None
            }
            for u in users
        ]
    }


# ==================== 연결된 유저 관리 ====================

@router.get("/linked-users")
def list_linked_users(
    q: Optional[str] = Query(None, description="닉네임 검색"),
    segment: Optional[str] = Query(None, description="세그먼트 필터"),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    이미 외부 계정과 연결된 V2User 목록.
    external_nickname 수정/연결 해제용.
    """
    from app.v2.models.user import V2User
    
    admin_id, admin_role = admin_info
    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")
    
    query = db.query(V2User).filter(V2User.external_nickname.isnot(None))
    
    if q:
        query = query.filter(
            func.lower(V2User.nickname).contains(q.lower()) |
            func.lower(V2User.external_nickname).contains(q.lower())
        )
    
    if segment:
        query = query.filter(V2User.hq_segment == segment)
    
    total = query.count()
    users = query.order_by(V2User.external_linked_at.desc()).offset(offset).limit(limit).all()
    
    return {
        "total": total,
        "users": [
            {
                "id": u.id,
                "nickname": u.nickname,
                "external_nickname": u.external_nickname,
                "hq_segment": u.hq_segment,
                "telegram_username": u.telegram_username,
                "external_linked_at": u.external_linked_at.isoformat() if u.external_linked_at else None,
            }
            for u in users
        ]
    }


class ExternalNicknameUpdateRequest(BaseModel):
    """외부 닉네임 수정 요청."""
    new_nickname: str = Field(..., description="새 외부 닉네임", min_length=1, max_length=100)


@router.patch("/users/{user_id}/external-nickname")
def update_user_external_nickname(
    user_id: int,
    request: ExternalNicknameUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    V2User의 external_nickname 수정.
    오타 수정 등에 사용.
    """
    from app.v2.models.user import V2User
    from app.v2.models.hq_prospective_user import HQProspectiveUser
    
    admin_id, admin_role = admin_info
    if admin_role not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")
    
    user = db.query(V2User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    
    old_nickname = user.external_nickname
    new_nickname = request.new_nickname.strip()
    
    # HQ에서 새 닉네임으로 잠재유저 찾기 (세그먼트 자동 업데이트용)
    prospect = db.query(HQProspectiveUser).filter(
        func.lower(HQProspectiveUser.nickname) == new_nickname.lower()
    ).first()
    
    user.external_nickname = new_nickname
    
    if prospect:
        # HQ에서 매칭되면 세그먼트도 업데이트
        user.hq_segment = prospect.segment
        if not prospect.linked_user_id:
            prospect.linked_user_id = user_id
            prospect.is_joined = True
            from datetime import datetime
            prospect.linked_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "success": True,
        "message": f"외부 닉네임이 '{old_nickname}' → '{new_nickname}'으로 수정되었습니다.",
        "user": {
            "id": user.id,
            "nickname": user.nickname,
            "external_nickname": user.external_nickname,
            "hq_segment": user.hq_segment,
        },
        "prospect_matched": prospect is not None
    }


@router.delete("/users/{user_id}/external-link")
def unlink_user_external(
    user_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    V2User의 외부 연결 해제.
    - external_nickname, hq_segment 초기화
    - HQProspectiveUser의 linked_user_id도 해제
    """
    from app.v2.models.user import V2User
    from app.v2.models.hq_prospective_user import HQProspectiveUser
    
    admin_id, admin_role = admin_info
    if admin_role not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")
    
    user = db.query(V2User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    
    if not user.external_nickname:
        raise HTTPException(status_code=400, detail="USER_NOT_LINKED")
    
    old_nickname = user.external_nickname
    old_segment = user.hq_segment
    
    # HQProspectiveUser에서 연결 해제
    prospect = db.query(HQProspectiveUser).filter_by(linked_user_id=user_id).first()
    if prospect:
        prospect.linked_user_id = None
        prospect.is_joined = False
        prospect.linked_at = None
    
    # V2User 초기화
    user.external_nickname = None
    user.external_linked_at = None
    user.hq_segment = None
    
    db.commit()
    
    return {
        "success": True,
        "message": f"'{old_nickname}' 연결이 해제되었습니다. (기존 세그먼트: {old_segment})",
        "user_id": user_id,
        "unlinked_nickname": old_nickname,
        "unlinked_segment": old_segment
    }


# ==================== 미동기화 유저 재동기화 ====================

@router.get("/pending-sync-users")
def list_pending_sync_users(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    미동기화 유저 목록 조회.
    
    external_nickname은 있지만 hq_segment가 없는 유저 (케이스 A).
    HQ 데이터와의 매칭 가능 여부도 함께 반환.
    """
    from app.v2.models.user import V2User
    from app.v2.models.hq_prospective_user import HQProspectiveUser
    
    admin_id, admin_role = admin_info
    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")
    
    # 미동기화 유저 조회
    pending_users = db.query(V2User).filter(
        V2User.external_nickname.isnot(None),
        V2User.hq_segment.is_(None)
    ).all()
    
    result = []
    for user in pending_users:
        # HQ 매칭 후보 찾기
        prospect = db.query(HQProspectiveUser).filter(
            func.lower(HQProspectiveUser.nickname) == user.external_nickname.lower(),
            HQProspectiveUser.linked_user_id.is_(None)
        ).first()
        
        result.append({
            "user_id": user.id,
            "nickname": user.nickname,
            "external_nickname": user.external_nickname,
            "telegram_username": user.telegram_username,
            "hq_match": {
                "found": prospect is not None,
                "prospect_id": prospect.id if prospect else None,
                "segment": prospect.segment if prospect else None,
                "total_charge": prospect.total_charge if prospect else None,
                "total_margin": prospect.total_margin if prospect else None,
            } if prospect else {"found": False}
        })
    
    return {
        "total": len(result),
        "syncable": len([r for r in result if r["hq_match"]["found"]]),
        "users": result
    }


@router.post("/sync-pending-users")
def sync_pending_external_users(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    미동기화 유저 일괄 재동기화 (방안 2: 어드민 수동 버튼).
    
    external_nickname은 있지만 hq_segment가 없는 유저들을
    HQ 데이터(HQProspectiveUser)와 자동 매칭.
    
    처리 내용:
    - HQProspectiveUser ↔ V2User 양방향 연결
    - V2User.hq_segment 설정
    - V2UserSegment 생성/업데이트
    - CC Deposit 처리 (금고/XP/미션 반영)
    
    중복 방지:
    - 이미 연결된 HQ 데이터는 스킵
    - 델타 계산 기반 XP/미션 처리 (동일 금액은 0)
    """
    from app.v2.services.hq_margin_import_service import HQMarginImportService
    from app.v2.services import V2AdminAuditService
    
    admin_id, admin_role = admin_info
    if admin_role not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")
    
    try:
        result = HQMarginImportService.sync_pending_external_users(db)
        
        # 감사 로그 기록
        V2AdminAuditService.log(
            db,
            admin_id=str(admin_id),
            action="PROSPECT_RESYNC",
            target_type="USER",
            target_id=None,
            after={
                "category": "GOLDEN",
                "reason": "Manual pending users sync",
                "stats": {
                    "synced": result["synced"],
                    "skipped": result["skipped"],
                    "total_pending": result["total_pending"],
                }
            },
        )
        
        return {
            "success": True,
            "message": f"{result['synced']}명의 유저가 동기화되었습니다.",
            **result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
