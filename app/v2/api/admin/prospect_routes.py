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
    limit: int = Query(50, ge=1, le=200),
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
