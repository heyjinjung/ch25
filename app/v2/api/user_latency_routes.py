"""V2 User Latency Survival Routes - 지연 입금 신고 API."""
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.v2.api.deps import get_db
from app.v2.api.deps import get_current_user
from app.v2.models.user import V2User
from app.v2.services.latency_survival_service import V2LatencySurvivalService


router = APIRouter()


# ==================== Request/Response Schemas ====================

class SubmitEvidenceRequest(BaseModel):
    """지연 입금 신고 요청.
    
    유저가 기억하는 대략적인 입금 정보만 입력받습니다.
    TX ID는 "금액_날짜_시간_유저ID" 형태로 자동 생성됩니다.
    """
    amount: int = Field(..., ge=1000, description="입금 금액 (원)", examples=[50000])
    deposit_date: str = Field(..., description="입금일 (YYYY-MM-DD)", examples=["2026-02-02"])
    deposit_time: str = Field(..., description="입금 시간 (HH:MM)", examples=["14:30"])


class SubmitEvidenceResponse(BaseModel):
    """지연 입금 신고 응답."""
    success: bool
    message: str
    evidence_id: int
    reward_granted: dict  # ex: {"ROULETTE_TICKET": 3}


class EvidenceStatusResponse(BaseModel):
    """내 신고 현황 응답."""
    id: int
    tx_id: str
    claimed_amount: int
    status: str  # PROVISIONAL, VERIFIED, REJECTED
    reward_json: Optional[dict]
    created_at: str
    verified_at: Optional[str]
    admin_memo: Optional[str]


# ==================== Routes ====================

@router.post("/latency/evidence", response_model=SubmitEvidenceResponse)
def submit_latency_evidence(
    request: SubmitEvidenceRequest,
    db: Session = Depends(get_db),
    current_user: V2User = Depends(get_current_user),
):
    """
    지연 입금 신고 제출 (선지급 시스템).
    
    - 입금 정보를 제출하면 즉시 룰렛 티켓 3장이 선지급됩니다.
    - 시간당 최대 3회까지 신고 가능합니다.
    - 허위 신고 시 선지급 재화 및 당첨금이 전액 회수됩니다.
    
    **SoT Policy**:
    - Trust First: 유저를 먼저 믿고 지급 (선지급 후검증)
    - Rate Limit: MAX 3회/User/Hour
    - Clawback: 반려 시 원금 + 당첨금 회수
    """
    # TX ID 자동 생성 (유저가 기억하는 정보 기반)
    # Format: "amount_date_time_userId" 
    tx_id = f"{request.amount}_{request.deposit_date}_{request.deposit_time}_{current_user.id}"
    
    try:
        evidence = V2LatencySurvivalService.submit_evidence(
            db=db,
            user_id=current_user.id,
            tx_id=tx_id,
            claimed_amount=request.amount,
            image_url=None  # 심플 폼이므로 이미지 없음
        )
        db.commit()

        reward_amount = V2LatencySurvivalService.PROVISIONAL_REWARD_AMOUNT
        
        return SubmitEvidenceResponse(
            success=True,
            message=f"신고가 접수되었습니다. 룰렛 티켓 {reward_amount}장이 선지급되었습니다.",
            evidence_id=evidence.id,
            reward_granted=evidence.reward_json or {}
        )
    except HTTPException as e:
        db.rollback()
        if e.detail == "DUPLICATE_TX_ID":
            raise HTTPException(
                status_code=400, 
                detail="이미 동일한 입금 정보로 신고가 접수되어 있습니다."
            )
        elif e.detail == "RATE_LIMIT_EXCEEDED":
            raise HTTPException(
                status_code=429, 
                detail="시간당 신고 횟수를 초과했습니다. 잠시 후 다시 시도해주세요."
            )
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/latency/evidence", response_model=list[EvidenceStatusResponse])
def get_my_evidences(
    db: Session = Depends(get_db),
    current_user: V2User = Depends(get_current_user),
):
    """
    내 지연 입금 신고 내역 조회.
    
    최근 30일 내 제출한 신고 목록을 반환합니다.
    """
    from datetime import timedelta
    from app.v2.models.v2_user_deposit_evidence import V2UserDepositEvidence
    
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    evidences = db.query(V2UserDepositEvidence).filter(
        V2UserDepositEvidence.user_id == current_user.id,
        V2UserDepositEvidence.created_at >= thirty_days_ago
    ).order_by(V2UserDepositEvidence.created_at.desc()).limit(20).all()
    
    return [
        EvidenceStatusResponse(
            id=e.id,
            tx_id=e.tx_id,
            claimed_amount=e.claimed_amount,
            status=e.status.value,
            reward_json=e.reward_json,
            created_at=e.created_at.isoformat() if e.created_at else "",
            verified_at=e.verified_at.isoformat() if e.verified_at else None,
            admin_memo=e.admin_memo if e.status.value == "REJECTED" else None
        )
        for e in evidences
    ]


@router.get("/latency/policy")
def get_latency_policy():
    """
    지연 입금 신고 정책 안내.
    
    유저에게 표시할 정책 문구를 반환합니다.
    """
    return {
        "provisional_reward": {
            "type": "ROULETTE_TICKET",
            "amount": V2LatencySurvivalService.PROVISIONAL_REWARD_AMOUNT
        },
        "rate_limit": {
            "max_per_hour": V2LatencySurvivalService.MAX_PROVISIONAL_PER_HOUR
        },
        "warnings": [
            "본 요청 승인 시, 보유 중인 티켓보다 선지급된 티켓이 우선 사용된 것으로 간주됩니다.",
            "추후 허위 신고로 판명될 경우, 선지급된 티켓과 해당 티켓으로 획득한 모든 당첨금(포인트/아이템)이 전액 회수됩니다.",
            "회수 시 잔액이 부족할 경우 마이너스 잔액(부채)으로 처리될 수 있습니다."
        ]
    }
