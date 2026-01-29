"""
V2 Admin Analytics Routes

분석 관리 API:
- 보유율(Retention) 분석 - D1, D7, D30 보유율, 추이 그래프
- 수익/지출 분석 - 일일/주간/월간 매출/지출 추이
- 마케팅 효율성 분석 - 채널별 ROI, 전환율, CAC
"""
from datetime import date, datetime, timedelta
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, and_, or_, case
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.models.user import User
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.v2.services import V2AdminAuditService

router = APIRouter(prefix="/analytics", tags=["admin-analytics"])


# ============================================================================
# Retention Analysis Schemas (보유율 분석)
# ============================================================================

class RetentionRateDto(BaseModel):
    """보유율 데이터"""
    cohort_date: str  # 코호트 날짜 (가입일 기준)
    total_users: int  # 해당 날짜 가입자 수
    d1_retained: int  # D1 보유자 수
    d1_rate: float  # D1 보유율 (0.0 ~ 1.0)
    d7_retained: int  # D7 보유자 수
    d7_rate: float  # D7 보유율
    d30_retained: int  # D30 보유자 수
    d30_rate: float  # D30 보유율


class RetentionSummaryDto(BaseModel):
    """보유율 요약"""
    period_start: str
    period_end: str
    total_cohort_users: int
    avg_d1_rate: float
    avg_d7_rate: float
    avg_d30_rate: float


class RetentionAnalysisResponse(BaseModel):
    """보유율 분석 응답"""
    summary: RetentionSummaryDto
    daily_retention: List[RetentionRateDto]


class RetentionTrendDto(BaseModel):
    """보유율 추이 데이터"""
    date: str
    d1_rate: float
    d7_rate: float
    d30_rate: float
    new_users: int


class RetentionTrendResponse(BaseModel):
    """보유율 추이 응답"""
    trend: List[RetentionTrendDto]
    period_start: str
    period_end: str


# ============================================================================
# Revenue/Expenditure Analysis Schemas (수익/지출 분석)
# ============================================================================

class DailyRevenueDto(BaseModel):
    """일일 수익 데이터"""
    date: str
    total_deposits: int  # 총 입금액
    total_withdrawals: int  # 총 출금액
    net_revenue: int  # 순수익 (입금 - 출금)
    deposit_count: int  # 입금 건수
    withdrawal_count: int  # 출금 건수
    active_depositors: int  # 입금한 유저 수


class RevenueBreakdownDto(BaseModel):
    """수익 상세 내역"""
    period: str  # "daily" | "weekly" | "monthly"
    start_date: str
    end_date: str
    total_revenue: int
    total_expenses: int
    net_income: int
    avg_daily_revenue: float
    avg_daily_expenses: float
    data: List[DailyRevenueDto]


class RevenueSummaryDto(BaseModel):
    """수익 요약"""
    today_revenue: int
    today_expenses: int
    this_week_revenue: int
    this_week_expenses: int
    this_month_revenue: int
    this_month_expenses: int
    revenue_growth_rate: float  # 전주 대비 성장률


# ============================================================================
# Marketing Efficiency Schemas (마케팅 효율성)
# ============================================================================

class ChannelPerformanceDto(BaseModel):
    """채널별 성과"""
    channel: str  # 채널명 (telegram, referral 등)
    new_users: int  # 신규 유저 수
    active_users: int  # 활성 유저 수
    total_deposits: int  # 총 입금액
    avg_deposit_per_user: float  # 유저당 평균 입금
    conversion_rate: float  # 전환율 (입금한 유저 / 전체 유저)
    cac: float  # Customer Acquisition Cost (추정)
    ltv: float  # Lifetime Value (추정)
    roi: float  # ROI ((LTV - CAC) / CAC)


class MarketingEfficiencyResponse(BaseModel):
    """마케팅 효율성 응답"""
    period_start: str
    period_end: str
    channels: List[ChannelPerformanceDto]
    total_new_users: int
    total_marketing_cost: float
    overall_cac: float
    overall_roi: float


# ============================================================================
# Helper Functions
# ============================================================================

def _get_kst_date(dt: datetime | None = None) -> date:
    """KST 기준 날짜 반환"""
    tz = ZoneInfo("Asia/Seoul")
    if dt:
        return dt.astimezone(tz).date()
    return datetime.now(tz).date()


def _calculate_retention(db: Session, cohort_date: date, retention_days: int) -> tuple[int, int]:
    """
    특정 코호트(가입일)의 N일 후 보유율 계산

    Returns:
        (retained_count, total_count)
    """
    cohort_start = datetime.combine(cohort_date, datetime.min.time())
    cohort_end = cohort_start + timedelta(days=1)

    # 해당 날짜에 가입한 유저
    cohort_users = db.query(User.id).filter(
        User.created_at >= cohort_start,
        User.created_at < cohort_end,
    ).subquery()

    total_count = db.query(func.count()).select_from(cohort_users).scalar() or 0

    if total_count == 0:
        return 0, 0

    # N일 후에 로그인한 유저
    target_date = cohort_date + timedelta(days=retention_days)
    target_start = datetime.combine(target_date, datetime.min.time())
    target_end = target_start + timedelta(days=1)

    retained_count = db.query(func.count(User.id)).filter(
        User.id.in_(db.query(cohort_users)),
        User.last_login_at >= target_start,
        User.last_login_at < target_end,
    ).scalar() or 0

    return retained_count, total_count


# ============================================================================
# Retention Analysis Endpoints
# ============================================================================

@router.get("/retention", response_model=RetentionAnalysisResponse)
def get_retention_analysis(
    start_date: str = Query(None, description="시작일 (YYYY-MM-DD)"),
    end_date: str = Query(None, description="종료일 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    보유율(Retention) 분석

    - D1, D7, D30 보유율을 코호트별로 계산
    - 가입일 기준으로 N일 후 재방문 여부 측정
    """
    today = _get_kst_date()

    # 기본: 최근 30일
    if end_date:
        period_end = date.fromisoformat(end_date)
    else:
        period_end = today - timedelta(days=1)  # 어제까지 (오늘 가입자는 D1 측정 불가)

    if start_date:
        period_start = date.fromisoformat(start_date)
    else:
        period_start = period_end - timedelta(days=29)  # 30일간

    # D30 측정을 위해 31일 이전까지만 분석 가능
    max_measurable_date = today - timedelta(days=31)
    if period_end > max_measurable_date:
        period_end = max_measurable_date

    daily_retention: List[RetentionRateDto] = []
    total_d1 = 0
    total_d7 = 0
    total_d30 = 0
    total_users = 0

    current_date = period_start
    while current_date <= period_end:
        # 코호트 사이즈 (해당 날짜 가입자)
        cohort_start = datetime.combine(current_date, datetime.min.time())
        cohort_end = cohort_start + timedelta(days=1)

        cohort_size = db.query(func.count(User.id)).filter(
            User.created_at >= cohort_start,
            User.created_at < cohort_end,
        ).scalar() or 0

        if cohort_size > 0:
            d1_retained, _ = _calculate_retention(db, current_date, 1)
            d7_retained, _ = _calculate_retention(db, current_date, 7)
            d30_retained, _ = _calculate_retention(db, current_date, 30)

            d1_rate = d1_retained / cohort_size if cohort_size > 0 else 0.0
            d7_rate = d7_retained / cohort_size if cohort_size > 0 else 0.0
            d30_rate = d30_retained / cohort_size if cohort_size > 0 else 0.0

            daily_retention.append(RetentionRateDto(
                cohort_date=current_date.isoformat(),
                total_users=cohort_size,
                d1_retained=d1_retained,
                d1_rate=round(d1_rate, 4),
                d7_retained=d7_retained,
                d7_rate=round(d7_rate, 4),
                d30_retained=d30_retained,
                d30_rate=round(d30_rate, 4),
            ))

            total_users += cohort_size
            total_d1 += d1_retained
            total_d7 += d7_retained
            total_d30 += d30_retained

        current_date += timedelta(days=1)

    # 평균 계산
    avg_d1_rate = total_d1 / total_users if total_users > 0 else 0.0
    avg_d7_rate = total_d7 / total_users if total_users > 0 else 0.0
    avg_d30_rate = total_d30 / total_users if total_users > 0 else 0.0

    summary = RetentionSummaryDto(
        period_start=period_start.isoformat(),
        period_end=period_end.isoformat(),
        total_cohort_users=total_users,
        avg_d1_rate=round(avg_d1_rate, 4),
        avg_d7_rate=round(avg_d7_rate, 4),
        avg_d30_rate=round(avg_d30_rate, 4),
    )

    return RetentionAnalysisResponse(
        summary=summary,
        daily_retention=daily_retention,
    )


@router.get("/retention/trend", response_model=RetentionTrendResponse)
def get_retention_trend(
    days: int = Query(30, ge=7, le=90, description="분석 기간 (일)"),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    보유율 추이 그래프 데이터

    - 일별 D1, D7, D30 보유율 추이
    - 그래프 시각화용 데이터
    """
    today = _get_kst_date()
    period_end = today - timedelta(days=31)  # D30 측정 가능한 마지막 날
    period_start = period_end - timedelta(days=days - 1)

    trend: List[RetentionTrendDto] = []

    current_date = period_start
    while current_date <= period_end:
        cohort_start = datetime.combine(current_date, datetime.min.time())
        cohort_end = cohort_start + timedelta(days=1)

        new_users = db.query(func.count(User.id)).filter(
            User.created_at >= cohort_start,
            User.created_at < cohort_end,
        ).scalar() or 0

        if new_users > 0:
            d1_retained, _ = _calculate_retention(db, current_date, 1)
            d7_retained, _ = _calculate_retention(db, current_date, 7)
            d30_retained, _ = _calculate_retention(db, current_date, 30)

            trend.append(RetentionTrendDto(
                date=current_date.isoformat(),
                d1_rate=round(d1_retained / new_users, 4) if new_users > 0 else 0.0,
                d7_rate=round(d7_retained / new_users, 4) if new_users > 0 else 0.0,
                d30_rate=round(d30_retained / new_users, 4) if new_users > 0 else 0.0,
                new_users=new_users,
            ))
        else:
            trend.append(RetentionTrendDto(
                date=current_date.isoformat(),
                d1_rate=0.0,
                d7_rate=0.0,
                d30_rate=0.0,
                new_users=0,
            ))

        current_date += timedelta(days=1)

    return RetentionTrendResponse(
        trend=trend,
        period_start=period_start.isoformat(),
        period_end=period_end.isoformat(),
    )


# ============================================================================
# Revenue/Expenditure Analysis Endpoints
# ============================================================================

@router.get("/revenue/breakdown", response_model=RevenueBreakdownDto)
def get_revenue_breakdown(
    period: str = Query("daily", description="기간 단위: daily, weekly, monthly"),
    start_date: str = Query(None, description="시작일 (YYYY-MM-DD)"),
    end_date: str = Query(None, description="종료일 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    수익/지출 분석

    - 일일/주간/월간 매출/지출 추이
    - 입금(수익) vs 출금(지출) 비교
    """
    today = _get_kst_date()

    if end_date:
        period_end = date.fromisoformat(end_date)
    else:
        period_end = today

    if start_date:
        period_start = date.fromisoformat(start_date)
    else:
        # 기본: daily=30일, weekly=12주, monthly=12개월
        if period == "weekly":
            period_start = period_end - timedelta(weeks=12)
        elif period == "monthly":
            period_start = period_end - timedelta(days=365)
        else:
            period_start = period_end - timedelta(days=30)

    data: List[DailyRevenueDto] = []
    total_revenue = 0
    total_expenses = 0

    current_date = period_start
    while current_date <= period_end:
        # 입금 (수익)
        deposit_stats = db.query(
            func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0).label("total"),
            func.count(ExternalRankingDailyDepositDelta.id).label("count"),
            func.count(func.distinct(ExternalRankingDailyDepositDelta.user_id)).label("users"),
        ).filter(
            ExternalRankingDailyDepositDelta.kst_date == current_date,
            ExternalRankingDailyDepositDelta.deposit_delta > 0,
        ).first()

        daily_deposits = int(deposit_stats.total or 0)
        deposit_count = int(deposit_stats.count or 0)
        active_depositors = int(deposit_stats.users or 0)

        # 출금 (지출) - 승인된 출금만
        withdrawal_stats = db.query(
            func.coalesce(func.sum(VaultWithdrawalRequest.amount), 0).label("total"),
            func.count(VaultWithdrawalRequest.id).label("count"),
        ).filter(
            func.date(VaultWithdrawalRequest.created_at) == current_date,
            VaultWithdrawalRequest.status == "APPROVED",
        ).first()

        daily_withdrawals = int(withdrawal_stats.total or 0)
        withdrawal_count = int(withdrawal_stats.count or 0)

        data.append(DailyRevenueDto(
            date=current_date.isoformat(),
            total_deposits=daily_deposits,
            total_withdrawals=daily_withdrawals,
            net_revenue=daily_deposits - daily_withdrawals,
            deposit_count=deposit_count,
            withdrawal_count=withdrawal_count,
            active_depositors=active_depositors,
        ))

        total_revenue += daily_deposits
        total_expenses += daily_withdrawals

        current_date += timedelta(days=1)

    days_count = (period_end - period_start).days + 1

    return RevenueBreakdownDto(
        period=period,
        start_date=period_start.isoformat(),
        end_date=period_end.isoformat(),
        total_revenue=total_revenue,
        total_expenses=total_expenses,
        net_income=total_revenue - total_expenses,
        avg_daily_revenue=round(total_revenue / days_count, 2) if days_count > 0 else 0.0,
        avg_daily_expenses=round(total_expenses / days_count, 2) if days_count > 0 else 0.0,
        data=data,
    )


@router.get("/revenue/summary", response_model=RevenueSummaryDto)
def get_revenue_summary(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    수익 요약 (대시보드용)

    - 오늘, 이번 주, 이번 달 수익/지출
    - 전주 대비 성장률
    """
    today = _get_kst_date()

    # 오늘
    today_deposits = db.query(func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0)).filter(
        ExternalRankingDailyDepositDelta.kst_date == today,
        ExternalRankingDailyDepositDelta.deposit_delta > 0,
    ).scalar() or 0

    today_withdrawals = db.query(func.coalesce(func.sum(VaultWithdrawalRequest.amount), 0)).filter(
        func.date(VaultWithdrawalRequest.created_at) == today,
        VaultWithdrawalRequest.status == "APPROVED",
    ).scalar() or 0

    # 이번 주 (월요일 기준)
    week_start = today - timedelta(days=today.weekday())
    week_deposits = db.query(func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0)).filter(
        ExternalRankingDailyDepositDelta.kst_date >= week_start,
        ExternalRankingDailyDepositDelta.kst_date <= today,
        ExternalRankingDailyDepositDelta.deposit_delta > 0,
    ).scalar() or 0

    week_withdrawals = db.query(func.coalesce(func.sum(VaultWithdrawalRequest.amount), 0)).filter(
        func.date(VaultWithdrawalRequest.created_at) >= week_start,
        func.date(VaultWithdrawalRequest.created_at) <= today,
        VaultWithdrawalRequest.status == "APPROVED",
    ).scalar() or 0

    # 이번 달
    month_start = today.replace(day=1)
    month_deposits = db.query(func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0)).filter(
        ExternalRankingDailyDepositDelta.kst_date >= month_start,
        ExternalRankingDailyDepositDelta.kst_date <= today,
        ExternalRankingDailyDepositDelta.deposit_delta > 0,
    ).scalar() or 0

    month_withdrawals = db.query(func.coalesce(func.sum(VaultWithdrawalRequest.amount), 0)).filter(
        func.date(VaultWithdrawalRequest.created_at) >= month_start,
        func.date(VaultWithdrawalRequest.created_at) <= today,
        VaultWithdrawalRequest.status == "APPROVED",
    ).scalar() or 0

    # 전주 대비 성장률
    prev_week_start = week_start - timedelta(weeks=1)
    prev_week_end = week_start - timedelta(days=1)

    prev_week_deposits = db.query(func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0)).filter(
        ExternalRankingDailyDepositDelta.kst_date >= prev_week_start,
        ExternalRankingDailyDepositDelta.kst_date <= prev_week_end,
        ExternalRankingDailyDepositDelta.deposit_delta > 0,
    ).scalar() or 0

    if prev_week_deposits > 0:
        growth_rate = (int(week_deposits) - int(prev_week_deposits)) / int(prev_week_deposits)
    else:
        growth_rate = 1.0 if int(week_deposits) > 0 else 0.0

    return RevenueSummaryDto(
        today_revenue=int(today_deposits),
        today_expenses=int(today_withdrawals),
        this_week_revenue=int(week_deposits),
        this_week_expenses=int(week_withdrawals),
        this_month_revenue=int(month_deposits),
        this_month_expenses=int(month_withdrawals),
        revenue_growth_rate=round(growth_rate, 4),
    )


# ============================================================================
# Marketing Efficiency Endpoints
# ============================================================================

@router.get("/marketing/channel-performance", response_model=MarketingEfficiencyResponse)
def get_channel_performance(
    start_date: str = Query(None, description="시작일 (YYYY-MM-DD)"),
    end_date: str = Query(None, description="종료일 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    마케팅 채널별 성과 분석

    - 채널별 신규 유저, 전환율, ROI
    - CAC (Customer Acquisition Cost) 추정
    - LTV (Lifetime Value) 추정
    """
    today = _get_kst_date()

    if end_date:
        period_end = date.fromisoformat(end_date)
    else:
        period_end = today

    if start_date:
        period_start = date.fromisoformat(start_date)
    else:
        period_start = period_end - timedelta(days=30)

    period_start_dt = datetime.combine(period_start, datetime.min.time())
    period_end_dt = datetime.combine(period_end, datetime.max.time())

    # 채널별 유저 분석
    # 현재는 referral_code 기반으로 채널 추정 (telegram, organic, referral 등)
    channels_data: List[ChannelPerformanceDto] = []

    # 전체 신규 유저
    total_new_users = db.query(func.count(User.id)).filter(
        User.created_at >= period_start_dt,
        User.created_at <= period_end_dt,
    ).scalar() or 0

    # 채널별 분석 (referral_code 기반 분류)
    channel_configs = [
        ("telegram", "telegram%"),  # 텔레그램에서 유입
        ("referral", "%"),  # 추천 코드 사용
        ("organic", None),  # 추천 코드 없음 (자연 유입)
    ]

    total_marketing_cost = 0.0

    for channel_name, ref_pattern in channel_configs:
        if ref_pattern is None:
            # Organic: referral_code가 NULL인 경우
            channel_users_query = db.query(User.id).filter(
                User.created_at >= period_start_dt,
                User.created_at <= period_end_dt,
                or_(User.referral_code.is_(None), User.referral_code == ""),
            )
        else:
            channel_users_query = db.query(User.id).filter(
                User.created_at >= period_start_dt,
                User.created_at <= period_end_dt,
                User.referral_code.ilike(ref_pattern),
            )

        channel_user_ids = [u.id for u in channel_users_query.all()]
        new_users = len(channel_user_ids)

        if new_users == 0:
            continue

        # 활성 유저 (최근 7일 내 로그인)
        active_threshold = datetime.utcnow() - timedelta(days=7)
        active_users = db.query(func.count(User.id)).filter(
            User.id.in_(channel_user_ids),
            User.last_login_at >= active_threshold,
        ).scalar() or 0

        # 입금 통계
        deposit_stats = db.query(
            func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0).label("total"),
            func.count(func.distinct(ExternalRankingDailyDepositDelta.user_id)).label("depositors"),
        ).filter(
            ExternalRankingDailyDepositDelta.user_id.in_(channel_user_ids),
            ExternalRankingDailyDepositDelta.deposit_delta > 0,
        ).first()

        total_deposits = int(deposit_stats.total or 0)
        depositors_count = int(deposit_stats.depositors or 0)

        # 전환율 (입금한 유저 / 전체 유저)
        conversion_rate = depositors_count / new_users if new_users > 0 else 0.0

        # 유저당 평균 입금
        avg_deposit = total_deposits / new_users if new_users > 0 else 0.0

        # CAC 추정 (마케팅 비용 / 신규 유저)
        # 채널별 추정 비용 (설정 가능하도록 하드코딩)
        channel_cost_map = {
            "telegram": 1000,  # 유저당 추정 1000원
            "referral": 500,   # 추천 보상 추정 500원
            "organic": 0,      # 자연 유입 비용 없음
        }
        estimated_cost = channel_cost_map.get(channel_name, 0) * new_users
        cac = estimated_cost / new_users if new_users > 0 else 0.0

        # LTV 추정 (평균 입금액 기반 간단 추정)
        ltv = avg_deposit * 1.5  # 입금액의 1.5배로 추정

        # ROI
        roi = (ltv - cac) / cac if cac > 0 else 0.0

        channels_data.append(ChannelPerformanceDto(
            channel=channel_name,
            new_users=new_users,
            active_users=active_users,
            total_deposits=total_deposits,
            avg_deposit_per_user=round(avg_deposit, 2),
            conversion_rate=round(conversion_rate, 4),
            cac=round(cac, 2),
            ltv=round(ltv, 2),
            roi=round(roi, 4),
        ))

        total_marketing_cost += estimated_cost

    overall_cac = total_marketing_cost / total_new_users if total_new_users > 0 else 0.0

    # 전체 LTV 추정
    total_deposits_all = db.query(func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0)).filter(
        ExternalRankingDailyDepositDelta.kst_date >= period_start,
        ExternalRankingDailyDepositDelta.kst_date <= period_end,
        ExternalRankingDailyDepositDelta.deposit_delta > 0,
    ).scalar() or 0

    overall_ltv = (int(total_deposits_all) / total_new_users * 1.5) if total_new_users > 0 else 0.0
    overall_roi = (overall_ltv - overall_cac) / overall_cac if overall_cac > 0 else 0.0

    return MarketingEfficiencyResponse(
        period_start=period_start.isoformat(),
        period_end=period_end.isoformat(),
        channels=channels_data,
        total_new_users=total_new_users,
        total_marketing_cost=round(total_marketing_cost, 2),
        overall_cac=round(overall_cac, 2),
        overall_roi=round(overall_roi, 4),
    )
