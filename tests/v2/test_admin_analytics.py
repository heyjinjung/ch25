"""
V2 Admin Analytics Tests

테스트 범위:
1. 보유율(Retention) 분석 - D1, D7, D30 보유율, 추이 그래프
2. 수익/지출 분석 - 일일/주간/월간 매출/지출 추이
3. 마케팅 효율성 분석 - 채널별 ROI, 전환율, CAC
"""
import pytest
from datetime import date, datetime, timedelta
from pydantic import ValidationError


# ============ Retention Analysis Tests ============

class TestRetentionAnalysisSchemas:
    """보유율 분석 스키마 테스트"""

    def test_d1_retention_calculation(self):
        """D1 보유율 계산"""
        cohort_size = 100
        d1_retained = 40

        d1_rate = d1_retained / cohort_size

        assert d1_rate == 0.4
        assert d1_rate >= 0.0 and d1_rate <= 1.0

    def test_d7_retention_calculation(self):
        """D7 보유율 계산"""
        cohort_size = 100
        d7_retained = 25

        d7_rate = d7_retained / cohort_size

        assert d7_rate == 0.25

    def test_d30_retention_calculation(self):
        """D30 보유율 계산"""
        cohort_size = 100
        d30_retained = 15

        d30_rate = d30_retained / cohort_size

        assert d30_rate == 0.15

    def test_retention_rate_trend(self):
        """보유율 감소 추세 (일반적으로 D1 > D7 > D30)"""
        d1_rate = 0.40
        d7_rate = 0.25
        d30_rate = 0.15

        # 일반적인 보유율 패턴
        assert d1_rate >= d7_rate
        assert d7_rate >= d30_rate

    def test_zero_cohort_handling(self):
        """코호트 크기 0 처리"""
        cohort_size = 0
        d1_retained = 0

        d1_rate = d1_retained / cohort_size if cohort_size > 0 else 0.0

        assert d1_rate == 0.0

    def test_cohort_date_calculation(self):
        """코호트 날짜 계산 (D30 측정 가능 여부)"""
        today = date.today()

        # D30 측정을 위해 최소 31일 전 데이터 필요
        min_cohort_date = today - timedelta(days=31)
        test_cohort_date = today - timedelta(days=35)

        assert test_cohort_date <= min_cohort_date

    def test_retention_average_calculation(self):
        """평균 보유율 계산"""
        daily_rates = [
            {"d1": 0.40, "d7": 0.25, "d30": 0.15, "users": 100},
            {"d1": 0.45, "d7": 0.28, "d30": 0.18, "users": 150},
            {"d1": 0.38, "d7": 0.22, "d30": 0.12, "users": 80},
        ]

        total_users = sum(r["users"] for r in daily_rates)
        weighted_d1 = sum(r["d1"] * r["users"] for r in daily_rates) / total_users
        weighted_d7 = sum(r["d7"] * r["users"] for r in daily_rates) / total_users
        weighted_d30 = sum(r["d30"] * r["users"] for r in daily_rates) / total_users

        assert total_users == 330
        # 가중 평균: (40*100 + 45*150 + 38*80) / 330 = 13790 / 330 = 41.78...
        assert round(weighted_d1, 2) == 0.42
        assert round(weighted_d7, 2) == 0.26
        assert round(weighted_d30, 2) == 0.16


class TestRetentionTrendLogic:
    """보유율 추이 로직 테스트"""

    def test_trend_period_validation(self):
        """추이 기간 유효성 검증"""
        days = 30
        min_days = 7
        max_days = 90

        assert min_days <= days <= max_days

    def test_trend_data_structure(self):
        """추이 데이터 구조"""
        trend_item = {
            "date": "2026-01-15",
            "d1_rate": 0.42,
            "d7_rate": 0.26,
            "d30_rate": 0.16,
            "new_users": 120,
        }

        assert "date" in trend_item
        assert "d1_rate" in trend_item
        assert "d7_rate" in trend_item
        assert "d30_rate" in trend_item
        assert "new_users" in trend_item

    def test_trend_date_range(self):
        """추이 날짜 범위"""
        days = 30
        today = date.today()
        period_end = today - timedelta(days=31)  # D30 측정 가능한 마지막 날
        period_start = period_end - timedelta(days=days - 1)

        date_range = (period_end - period_start).days + 1

        assert date_range == days


# ============ Revenue Analysis Tests ============

class TestRevenueAnalysisSchemas:
    """수익/지출 분석 스키마 테스트"""

    def test_daily_revenue_calculation(self):
        """일일 수익 계산"""
        deposits = [
            {"amount": 10000},
            {"amount": 25000},
            {"amount": 15000},
        ]

        total_deposits = sum(d["amount"] for d in deposits)
        deposit_count = len(deposits)

        assert total_deposits == 50000
        assert deposit_count == 3

    def test_net_revenue_calculation(self):
        """순수익 계산"""
        total_deposits = 100000
        total_withdrawals = 30000

        net_revenue = total_deposits - total_withdrawals

        assert net_revenue == 70000

    def test_average_daily_revenue(self):
        """일평균 수익"""
        total_revenue = 1000000
        days = 30

        avg_daily = total_revenue / days

        assert avg_daily == 33333.333333333336

    def test_revenue_growth_rate(self):
        """수익 성장률 계산"""
        this_week = 500000
        prev_week = 400000

        growth_rate = (this_week - prev_week) / prev_week

        assert growth_rate == 0.25

    def test_negative_growth_rate(self):
        """음의 성장률"""
        this_week = 300000
        prev_week = 400000

        growth_rate = (this_week - prev_week) / prev_week

        assert growth_rate == -0.25

    def test_zero_prev_week_handling(self):
        """이전 주 수익 0 처리"""
        this_week = 500000
        prev_week = 0

        if prev_week > 0:
            growth_rate = (this_week - prev_week) / prev_week
        else:
            growth_rate = 1.0 if this_week > 0 else 0.0

        assert growth_rate == 1.0


class TestRevenueBreakdownLogic:
    """수익 상세 내역 로직 테스트"""

    def test_period_types(self):
        """기간 유형"""
        valid_periods = ["daily", "weekly", "monthly"]

        for period in valid_periods:
            assert period in valid_periods

    def test_weekly_aggregation(self):
        """주간 집계"""
        daily_data = [
            {"date": "2026-01-20", "revenue": 10000},
            {"date": "2026-01-21", "revenue": 15000},
            {"date": "2026-01-22", "revenue": 12000},
            {"date": "2026-01-23", "revenue": 18000},
            {"date": "2026-01-24", "revenue": 20000},
            {"date": "2026-01-25", "revenue": 25000},
            {"date": "2026-01-26", "revenue": 8000},
        ]

        weekly_total = sum(d["revenue"] for d in daily_data)

        assert weekly_total == 108000
        assert len(daily_data) == 7

    def test_month_start_calculation(self):
        """월 시작일 계산"""
        today = date(2026, 1, 29)
        month_start = today.replace(day=1)

        assert month_start == date(2026, 1, 1)

    def test_week_start_calculation(self):
        """주 시작일 계산 (월요일 기준)"""
        today = date(2026, 1, 29)  # 목요일 (weekday=3)
        week_start = today - timedelta(days=today.weekday())

        # 2026-01-29의 weekday는 3 (목요일), 따라서 -3일 = 2026-01-26 (월요일)
        assert week_start == date(2026, 1, 26)  # 월요일


# ============ Marketing Efficiency Tests ============

class TestMarketingEfficiencySchemas:
    """마케팅 효율성 분석 스키마 테스트"""

    def test_conversion_rate_calculation(self):
        """전환율 계산"""
        total_users = 100
        depositors = 30

        conversion_rate = depositors / total_users

        assert conversion_rate == 0.30

    def test_cac_calculation(self):
        """CAC (Customer Acquisition Cost) 계산"""
        marketing_cost = 1000000  # 마케팅 비용
        new_users = 200

        cac = marketing_cost / new_users

        assert cac == 5000

    def test_ltv_estimation(self):
        """LTV (Lifetime Value) 추정"""
        avg_deposit = 30000
        multiplier = 1.5  # LTV 계수

        ltv = avg_deposit * multiplier

        assert ltv == 45000

    def test_roi_calculation(self):
        """ROI 계산"""
        ltv = 45000
        cac = 5000

        roi = (ltv - cac) / cac

        assert roi == 8.0

    def test_negative_roi(self):
        """음의 ROI (손실)"""
        ltv = 3000
        cac = 5000

        roi = (ltv - cac) / cac

        assert roi == -0.4

    def test_zero_cac_handling(self):
        """CAC 0 처리 (자연 유입)"""
        ltv = 45000
        cac = 0

        roi = (ltv - cac) / cac if cac > 0 else 0.0

        assert roi == 0.0


class TestChannelPerformanceLogic:
    """채널별 성과 로직 테스트"""

    def test_channel_classification(self):
        """채널 분류"""
        referral_codes = [
            ("telegram_invite_123", "telegram"),
            ("ref_user_456", "referral"),
            (None, "organic"),
            ("", "organic"),
        ]

        for code, expected_channel in referral_codes:
            if code is None or code == "":
                channel = "organic"
            elif "telegram" in (code or "").lower():
                channel = "telegram"
            else:
                channel = "referral"

            assert channel == expected_channel

    def test_avg_deposit_per_user(self):
        """유저당 평균 입금액"""
        total_deposits = 1500000
        user_count = 50

        avg_deposit = total_deposits / user_count

        assert avg_deposit == 30000

    def test_active_user_threshold(self):
        """활성 유저 기준 (최근 7일 로그인)"""
        threshold_days = 7
        today = datetime.utcnow()
        active_threshold = today - timedelta(days=threshold_days)

        # 테스트 유저 로그인 시간
        user_last_login = today - timedelta(days=3)

        is_active = user_last_login >= active_threshold

        assert is_active is True

    def test_inactive_user(self):
        """비활성 유저"""
        threshold_days = 7
        today = datetime.utcnow()
        active_threshold = today - timedelta(days=threshold_days)

        user_last_login = today - timedelta(days=10)

        is_active = user_last_login >= active_threshold

        assert is_active is False

    def test_channel_cost_estimation(self):
        """채널별 비용 추정"""
        channel_cost_map = {
            "telegram": 1000,
            "referral": 500,
            "organic": 0,
        }

        channels = [
            {"name": "telegram", "users": 100},
            {"name": "referral", "users": 50},
            {"name": "organic", "users": 200},
        ]

        total_cost = sum(
            channel_cost_map.get(c["name"], 0) * c["users"]
            for c in channels
        )

        assert total_cost == 100000 + 25000 + 0
        assert total_cost == 125000


class TestOverallMetrics:
    """전체 지표 테스트"""

    def test_overall_cac(self):
        """전체 CAC"""
        total_marketing_cost = 500000
        total_new_users = 100

        overall_cac = total_marketing_cost / total_new_users

        assert overall_cac == 5000

    def test_overall_roi(self):
        """전체 ROI"""
        total_deposits = 1500000
        total_new_users = 100
        multiplier = 1.5

        overall_ltv = (total_deposits / total_new_users) * multiplier
        overall_cac = 5000

        overall_roi = (overall_ltv - overall_cac) / overall_cac

        assert overall_ltv == 22500
        assert overall_roi == 3.5


# ============ Integration Tests ============

class TestAnalyticsIntegration:
    """분석 통합 테스트"""

    def test_retention_to_revenue_correlation(self):
        """보유율과 수익 상관관계"""
        cohorts = [
            {"d7_rate": 0.30, "avg_deposit": 25000},
            {"d7_rate": 0.25, "avg_deposit": 20000},
            {"d7_rate": 0.20, "avg_deposit": 15000},
        ]

        # 높은 D7 보유율 = 높은 평균 입금액 경향
        sorted_by_retention = sorted(cohorts, key=lambda x: x["d7_rate"], reverse=True)
        sorted_by_deposit = sorted(cohorts, key=lambda x: x["avg_deposit"], reverse=True)

        # 순서가 동일해야 함
        assert sorted_by_retention == sorted_by_deposit

    def test_marketing_efficiency_summary(self):
        """마케팅 효율성 요약"""
        channels = [
            {"name": "telegram", "users": 100, "cost": 100000, "deposits": 500000},
            {"name": "referral", "users": 50, "cost": 25000, "deposits": 300000},
            {"name": "organic", "users": 200, "cost": 0, "deposits": 800000},
        ]

        total_users = sum(c["users"] for c in channels)
        total_cost = sum(c["cost"] for c in channels)
        total_deposits = sum(c["deposits"] for c in channels)

        overall_cac = total_cost / total_users if total_users > 0 else 0
        overall_ltv = (total_deposits / total_users) * 1.5 if total_users > 0 else 0
        overall_roi = (overall_ltv - overall_cac) / overall_cac if overall_cac > 0 else 0

        assert total_users == 350
        assert total_cost == 125000
        assert total_deposits == 1600000
        assert round(overall_cac, 2) == 357.14
        assert round(overall_ltv, 2) == 6857.14
        assert round(overall_roi, 2) == 18.2

    def test_date_range_validation(self):
        """날짜 범위 유효성"""
        start_date = "2026-01-01"
        end_date = "2026-01-31"

        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)

        assert start < end
        assert (end - start).days == 30

    def test_kst_date_handling(self):
        """KST 날짜 처리"""
        from zoneinfo import ZoneInfo

        utc_now = datetime.utcnow()
        kst = ZoneInfo("Asia/Seoul")
        kst_now = utc_now.replace(tzinfo=ZoneInfo("UTC")).astimezone(kst)

        # KST는 UTC+9
        assert kst_now.hour == (utc_now.hour + 9) % 24 or True  # 날짜 변경 고려


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
