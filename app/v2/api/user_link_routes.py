"""User External Linking Routes - 유저 자체 연동 API."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.v2.api.deps import get_current_user_id, get_db
from app.v2.services.prospect_linking_service import ProspectLinkingService
from app.v2.models.user import V2User

router = APIRouter()


# ==================== Request/Response Schemas ====================

class ExternalLinkRequest(BaseModel):
    """외부 계정 연동 요청."""
    external_nickname: str = Field(
        ..., 
        description="외부 카지노 닉네임",
        min_length=1,
        max_length=100
    )


class ExternalLinkResponse(BaseModel):
    """외부 계정 연동 응답."""
    success: bool
    message: str
    segment: str | None = None
    total_margin: int | None = None
    total_charge: int | None = None
    pending: bool = False


class LinkStatusResponse(BaseModel):
    """연동 상태 조회 응답."""
    is_linked: bool
    external_nickname: str | None = None
    linked_at: str | None = None
    segment: str | None = None
    benefits: list[str] = []


# ==================== Routes ====================

@router.get("/link-status")
def get_link_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> LinkStatusResponse:
    """
    현재 유저의 외부 계정 연동 상태 조회.
    
    Returns:
        연동 여부, 연동된 닉네임, 세그먼트, 혜택 목록
    """
    user = db.query(V2User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    
    is_linked = bool(user.external_nickname)
    
    # 세그먼트별 혜택 목록
    benefits_map = {
        "VIP": [
            "일일 보너스 2배 지급",
            "전용 VIP 이벤트 참여 자격",
            "우선 출금 처리",
            "개인 담당자 배정"
        ],
        "WHALE": [
            "일일 보너스 3배 지급",
            "WHALE 전용 프리미엄 이벤트",
            "즉시 출금 처리",
            "전담 VIP 매니저 배정",
            "특별 캐시백 프로그램"
        ],
        "AT_RISK": [
            "특별 복귀 보너스 지급",
            "무료 게임 티켓 증정"
        ]
    }
    
    segment = user.hq_segment
    benefits = benefits_map.get(segment, []) if segment else []
    
    return LinkStatusResponse(
        is_linked=is_linked,
        external_nickname=user.external_nickname,
        linked_at=user.external_linked_at.isoformat() if user.external_linked_at else None,
        segment=segment,
        benefits=benefits
    )


@router.post("/link-external")
def link_external_account(
    request: ExternalLinkRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> ExternalLinkResponse:
    """
    외부 카지노 계정 연동.
    
    - HQProspectiveUser 테이블에서 닉네임으로 검색
    - 매칭 성공 시: VIP/WHALE 세그먼트 즉시 적용
    - 매칭 실패 시: 닉네임 등록 후 추후 동기화 대기
    
    Request:
    ```json
    {
        "external_nickname": "큰손고래123"
    }
    ```
    
    Response (성공):
    ```json
    {
        "success": true,
        "message": "🎉 VIP 회원으로 등록되었습니다!",
        "segment": "VIP",
        "total_margin": 5000000,
        "total_charge": 10000000
    }
    ```
    
    Response (대기):
    ```json
    {
        "success": true,
        "message": "계정 연동 정보가 등록되었습니다.",
        "segment": null,
        "pending": true
    }
    ```
    """
    service = ProspectLinkingService(db)
    result = service.user_self_link(
        user_id=user_id,
        external_nickname=request.external_nickname.strip()
    )
    
    return ExternalLinkResponse(**result)


@router.delete("/link-external")
def unlink_external_account(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    외부 계정 연동 해제.
    
    - 연동 정보만 삭제 (세그먼트는 유지됨)
    - 재연동 가능
    """
    user = db.query(V2User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    
    if not user.external_nickname:
        raise HTTPException(status_code=400, detail="NOT_LINKED")
    
    old_nickname = user.external_nickname
    user.external_nickname = None
    user.external_linked_at = None
    # Note: hq_segment는 유지 (한번 VIP면 계속 VIP)
    
    db.commit()
    
    return {
        "success": True,
        "message": f"'{old_nickname}' 연동이 해제되었습니다."
    }
