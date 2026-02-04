"""Pydantic schemas for unmatched deposit log APIs.

설계 문서: v2_golden_hq_margin_cc_deposit_auto_reflection_design_ko.md
섹션 8. API 계약 (미매칭 입금 로그)
"""

from datetime import date, datetime
from typing import Optional

from pydantic import ConfigDict, Field

from app.v2.schemas.base import KstBaseModel as BaseModel


# =============================================================================
# Enums (re-export from model for convenience)
# =============================================================================
class UnmatchedStatusEnum:
    UNMATCHED = "UNMATCHED"
    AMBIGUOUS = "AMBIGUOUS"
    MATCHED = "MATCHED"
    IGNORED = "IGNORED"


# =============================================================================
# Request Schemas
# =============================================================================
class UnmatchedDepositListParams(BaseModel):
    """GET /api/v2/admin/deposits/unmatched 쿼리 파라미터"""
    hours: int = Field(default=24, ge=1, le=720, description="조회 기간 (시간)")
    status: str = Field(default="UNMATCHED", description="상태 필터 (UNMATCHED, AMBIGUOUS, ALL)")
    limit: int = Field(default=50, ge=1, le=200, description="페이지 크기")
    offset: int = Field(default=0, ge=0, description="오프셋")


class UnmatchedDepositLinkRequest(BaseModel):
    """POST /api/v2/admin/deposits/unmatched/{id}/link 요청"""
    user_id: int = Field(..., description="매칭할 V2User ID")


class UnmatchedDepositIgnoreRequest(BaseModel):
    """POST /api/v2/admin/deposits/unmatched/{id}/ignore 요청"""
    reason: str = Field(..., max_length=200, description="무시 사유")


# =============================================================================
# Response Schemas
# =============================================================================
class SimilarUserSuggestion(BaseModel):
    """유사 유저 제안"""
    user_id: int
    nickname: str
    cc_id: Optional[str] = None
    similarity: float = Field(..., description="유사도 (0-100)")


class UnmatchedDepositItem(BaseModel):
    """미매칭 로그 항목"""
    id: int
    source: str
    raw_cc_id: str = Field(..., alias="rawCcId", serialization_alias="rawCcId")
    raw_nickname: Optional[str] = Field(None, alias="rawNickname", serialization_alias="rawNickname")
    total_charge: int = Field(..., alias="totalCharge", serialization_alias="totalCharge")
    prev_total: int = Field(0, alias="prevTotal", serialization_alias="prevTotal")
    delta: int
    kst_date: date = Field(..., alias="kstDate", serialization_alias="kstDate")
    status: str
    reason: Optional[str] = None
    matched_user_id: Optional[int] = Field(None, alias="matchedUserId", serialization_alias="matchedUserId")
    matched_at: Optional[datetime] = Field(None, alias="matchedAt", serialization_alias="matchedAt")
    processed_at: Optional[datetime] = Field(None, alias="processedAt", serialization_alias="processedAt")
    admin_id: Optional[int] = Field(None, alias="adminId", serialization_alias="adminId")
    created_at: datetime = Field(..., alias="createdAt", serialization_alias="createdAt")
    suggestions: list[SimilarUserSuggestion] = Field(default_factory=list, description="유사 유저 제안 목록")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class UnmatchedDepositStats(BaseModel):
    """미매칭 로그 통계"""
    unmatched: int = Field(0, description="미매칭 건수")
    ambiguous: int = Field(0, description="모호한 매칭 건수")
    matched_today: int = Field(0, alias="matchedToday", serialization_alias="matchedToday", description="오늘 매칭된 건수")


class UnmatchedDepositListResponse(BaseModel):
    """GET /api/v2/admin/deposits/unmatched 응답"""
    items: list[UnmatchedDepositItem]
    total: int
    stats: UnmatchedDepositStats


class UnmatchedDepositLinkResult(BaseModel):
    """수동 매칭 결과"""
    user_id: int = Field(..., alias="userId", serialization_alias="userId")
    deposit_amount: int = Field(..., alias="depositAmount", serialization_alias="depositAmount")
    delta_applied: int = Field(..., alias="deltaApplied", serialization_alias="deltaApplied")
    xp_granted: int = Field(..., alias="xpGranted", serialization_alias="xpGranted")
    segment: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class UnmatchedDepositLinkResponse(BaseModel):
    """POST /api/v2/admin/deposits/unmatched/{id}/link 응답"""
    success: bool
    message: str
    result: Optional[UnmatchedDepositLinkResult] = None


class UnmatchedDepositIgnoreResponse(BaseModel):
    """POST /api/v2/admin/deposits/unmatched/{id}/ignore 응답"""
    success: bool
    message: str


class UnmatchedDepositStatsResponse(BaseModel):
    """GET /api/v2/admin/deposits/unmatched/stats 응답"""
    total_unmatched: int = Field(..., alias="totalUnmatched", serialization_alias="totalUnmatched")
    total_ambiguous: int = Field(..., alias="totalAmbiguous", serialization_alias="totalAmbiguous")
    matched_last_24h: int = Field(..., alias="matchedLast24h", serialization_alias="matchedLast24h")
    ignored_last_24h: int = Field(..., alias="ignoredLast24h", serialization_alias="ignoredLast24h")
    pending_by_source: dict[str, int] = Field(..., alias="pendingBySource", serialization_alias="pendingBySource")
    top_reasons: list[dict] = Field(..., alias="topReasons", serialization_alias="topReasons")

    model_config = ConfigDict(populate_by_name=True)
