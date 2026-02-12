"""SEO 일일 검색 미션 API 라우트.

Endpoints:
  POST /api/v2/seo-mission/claim    — 코드 입력 및 보상 수령
  GET  /api/v2/seo-mission/status   — 오늘 미션 상태 조회
  GET  /api/v2/seo-mission/public/today-hint — (Public) 오늘 코드 힌트
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.v2.api.deps import get_current_user_id, get_db
from app.v2.services.seo_code_service import V2SeoCodeService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/seo-mission", tags=["seo-mission"])


# ── Schemas ──────────────────────────────────────────────

class SeoCodeClaimRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=20, description="검색 미션 코드")


class SeoCodeClaimResponse(BaseModel):
    success: bool
    reward_amount: int | None = None
    message: str | None = None


class SeoMissionStatusResponse(BaseModel):
    has_claimed_today: bool
    reward_amount: int | None = None


class SeoPublicHintResponse(BaseModel):
    code: str | None = None
    message: str | None = None


# ── Endpoints ────────────────────────────────────────────

@router.post("/claim", response_model=SeoCodeClaimResponse)
def claim_seo_code(
    payload: SeoCodeClaimRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> SeoCodeClaimResponse:
    """SEO 검색 미션 코드를 입력하여 포인트를 수령한다."""
    service = V2SeoCodeService(db)

    try:
        result = service.claim_code(user_id, payload.code)
        return SeoCodeClaimResponse(**result)
    except ValueError as e:
        error_code = str(e)
        status_map = {
            "INVALID_CODE": 404,
            "CODE_EXPIRED": 400,
            "ALREADY_CLAIMED": 400,
            "DAILY_LIMIT_REACHED": 400,
        }
        raise HTTPException(
            status_code=status_map.get(error_code, 400),
            detail=error_code,
        )


@router.get("/status", response_model=SeoMissionStatusResponse)
def get_seo_mission_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> SeoMissionStatusResponse:
    """오늘의 SEO 미션 상태를 조회한다."""
    service = V2SeoCodeService(db)
    result = service.get_today_status(user_id)
    return SeoMissionStatusResponse(**result)


@router.get("/public/today-hint", response_model=SeoPublicHintResponse)
def get_public_seo_hint(db: Session = Depends(get_db)):
    """비인증 엔드포인트: 오늘의 SEO 코드 반환.

    Referrer 체크는 프론트엔드에서 수행.
    Rate limit: 분당 30회 (nginx 또는 FastAPI middleware에서 설정).
    """
    service = V2SeoCodeService(db)
    code = service.get_today_code()
    if not code:
        return {"code": None, "message": "오늘의 코드가 아직 생성되지 않았습니다."}
    return {"code": code.code}
