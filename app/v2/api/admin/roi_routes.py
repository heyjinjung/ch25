"""
V2 Admin ROI Routes

ROI 분석 관리 API:
- 캠페인별 ROI 조회
- 상위 ROI 캠페인 조회
- ROI 통계 대시보드
"""
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.v2.services.roi_analysis_service import V2RoiAnalysisService

router = APIRouter(prefix="/roi", tags=["admin-roi"])


# ============ Schemas ============

class CampaignRoiResponse(BaseModel):
    """캠페인 ROI 응답"""
    total_users: int
    total_cost: float
    total_return: float
    avg_roi: float
    positive_roi_count: int


class TopCampaignItem(BaseModel):
    """상위 캠페인 항목"""
    event_type: str
    user_count: int
    avg_roi: float
    total_cost: float
    total_return: float


class TopCampaignsResponse(BaseModel):
    """상위 캠페인 목록 응답"""
    campaigns: list[TopCampaignItem]


# ============ Endpoints ============

@router.get("/campaign/{event_type}", response_model=CampaignRoiResponse)
def get_campaign_roi(
    event_type: str,
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    캠페인별 ROI 조회

    Args:
        event_type: 캠페인 타입 (예: "daily_nudge")
        start_date: 시작일 (optional)
        end_date: 종료일 (optional)

    Returns:
        CampaignRoiResponse: 캠페인 ROI 집계
    """
    result = V2RoiAnalysisService.analyze_campaign_roi(
        db,
        event_type=event_type,
        start_date=start_date,
        end_date=end_date,
    )

    return CampaignRoiResponse(**result)


@router.get("/top-campaigns", response_model=TopCampaignsResponse)
def get_top_roi_campaigns(
    limit: int = Query(10, ge=1, le=50),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    ROI 상위 캠페인 조회

    Args:
        limit: 조회 개수 (1~50, 기본 10)
        start_date: 시작일 (optional)
        end_date: 종료일 (optional)

    Returns:
        TopCampaignsResponse: ROI 상위 캠페인 목록
    """
    campaigns = V2RoiAnalysisService.get_top_roi_campaigns(
        db,
        limit=limit,
        start_date=start_date,
        end_date=end_date,
    )

    return TopCampaignsResponse(
        campaigns=[TopCampaignItem(**c) for c in campaigns]
    )
