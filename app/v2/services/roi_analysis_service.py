"""
V2 ROI Analysis Service

ROI (Return on Investment) 분석 서비스:
- 개입(Intervention) 후 24시간/7일 내 행동 추적
- 비용(Cost) 대비 효과(Return) 자동 계산
- KRW 환산 ROI 산출
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.v2.models import UserActivity
from app.v2.models.v2_retention_roi_log import V2RetentionRoiLog
from app.utils.timezone import business_day_start


class RoiConfig:
    """ROI 계산용 가치 설정"""

    # 보상 원가 (KRW)
    ROULETTE_TICKET_COST = 100  # 룰렛 티켓 1장당 100원
    DICE_TICKET_COST = 100      # 주사위 티켓 1장당 100원
    VAULT_KRW_COST = 1          # 금고 1원당 1원 (1:1)

    # 행동 가치 (KRW)
    LOGIN_VALUE = 50            # 접속 1회당 50원
    AD_VIEW_VALUE = 10          # 광고 시청 1회당 10원
    GAME_PLAY_VALUE = 20        # 게임 플레이 1회당 20원

    @classmethod
    def get_reward_cost(cls, reward_type: str, amount: int) -> int:
        """
        보상 원가 계산

        Args:
            reward_type: 보상 유형 (ROULETTE, DICE, VAULT)
            amount: 보상 수량

        Returns:
            int: 원가 (KRW)
        """
        if reward_type == "ROULETTE":
            return cls.ROULETTE_TICKET_COST * amount
        elif reward_type == "DICE":
            return cls.DICE_TICKET_COST * amount
        elif reward_type == "VAULT":
            return cls.VAULT_KRW_COST * amount
        else:
            return 0


class V2RoiAnalysisService:
    """ROI 분석 서비스"""

    @staticmethod
    def calculate_user_roi_24h(
        db: Session,
        user_id: int,
        intervention_at: datetime,
        cost_krw: int,
    ) -> dict[str, Any]:
        """
        개입 후 24시간 ROI 계산

        Args:
            db: DB 세션
            user_id: 유저 ID
            intervention_at: 개입 시각
            cost_krw: 개입 비용 (KRW)

        Returns:
            dict: ROI 분석 결과
                - cost_krw: int
                - login_count_24h: int
                - vault_spent_24h: int
                - game_play_count_24h: int
                - ad_view_count_24h: int (추후 확장)
                - return_value_krw: int
                - roi_percentage: float
        """
        # 24시간 윈도우
        window_start = intervention_at
        window_end = intervention_at + timedelta(hours=24)

        # 1. 로그인 횟수 (UserActivity 기준)
        login_count = 0
        activity = db.query(UserActivity).filter(
            UserActivity.user_id == user_id
        ).first()

        if activity and activity.last_login_at:
            if window_start <= activity.last_login_at <= window_end:
                login_count = 1  # 최소 1회 로그인

        # 2. 금고 사용량 (VaultLedger 기준)
        # 실제 구현 시 VaultLedger 테이블 조회 필요
        vault_spent_24h = 0  # Placeholder

        # 3. 게임 플레이 횟수 (UserActivity 기준)
        game_play_count_24h = 0
        if activity:
            game_play_count_24h = (
                (activity.roulette_plays or 0) +
                (activity.dice_plays or 0) +
                (activity.lottery_plays or 0)
            )

        # 4. 광고 시청 횟수 (추후 확장)
        ad_view_count_24h = 0  # Placeholder

        # Return Value 계산
        return_value_krw = (
            (login_count * RoiConfig.LOGIN_VALUE) +
            vault_spent_24h +  # 금고 사용액은 그대로 매출
            (game_play_count_24h * RoiConfig.GAME_PLAY_VALUE) +
            (ad_view_count_24h * RoiConfig.AD_VIEW_VALUE)
        )

        # ROI 계산
        if cost_krw > 0:
            roi_percentage = ((return_value_krw - cost_krw) / cost_krw) * 100
        else:
            roi_percentage = 0.0

        return {
            "cost_krw": cost_krw,
            "login_count_24h": login_count,
            "vault_spent_24h": vault_spent_24h,
            "game_play_count_24h": game_play_count_24h,
            "ad_view_count_24h": ad_view_count_24h,
            "return_value_krw": return_value_krw,
            "roi_percentage": round(roi_percentage, 2),
        }

    @staticmethod
    def save_roi_log(
        db: Session,
        user_id: int,
        event_type: str,
        reward_type: str,
        reward_amount: int,
        roi_data: dict[str, Any],
    ) -> V2RetentionRoiLog:
        """
        ROI 로그 저장

        Args:
            db: DB 세션
            user_id: 유저 ID
            event_type: 이벤트 타입 (예: "daily_nudge", "retention_intervention")
            reward_type: 보상 유형
            reward_amount: 보상 수량
            roi_data: ROI 계산 결과

        Returns:
            V2RetentionRoiLog: 저장된 ROI 로그
        """
        roi_log = V2RetentionRoiLog(
            user_id=user_id,
            event_type=event_type,
            reward_type=reward_type,
            reward_amount=reward_amount,
            marketing_cost=float(roi_data["cost_krw"]),
            predicted_ltv=float(roi_data["return_value_krw"]),
            roi_percent=roi_data["roi_percentage"],
        )

        db.add(roi_log)
        db.commit()
        db.refresh(roi_log)

        return roi_log

    @staticmethod
    def analyze_campaign_roi(
        db: Session,
        event_type: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> dict[str, Any]:
        """
        캠페인별 ROI 분석

        Args:
            db: DB 세션
            event_type: 캠페인 타입
            start_date: 시작일 (None이면 전체)
            end_date: 종료일 (None이면 현재까지)

        Returns:
            dict: 캠페인 ROI 집계
                - total_users: int
                - total_cost: float
                - total_return: float
                - avg_roi: float
                - positive_roi_count: int
        """
        query = db.query(V2RetentionRoiLog).filter(
            V2RetentionRoiLog.event_type == event_type
        )

        if start_date:
            query = query.filter(V2RetentionRoiLog.created_at >= start_date)
        if end_date:
            query = query.filter(V2RetentionRoiLog.created_at <= end_date)

        logs = query.all()

        if not logs:
            return {
                "total_users": 0,
                "total_cost": 0.0,
                "total_return": 0.0,
                "avg_roi": 0.0,
                "positive_roi_count": 0,
            }

        total_users = len(logs)
        total_cost = sum(log.marketing_cost for log in logs)
        total_return = sum(log.predicted_ltv for log in logs)
        positive_roi_count = sum(1 for log in logs if log.roi_percent > 0)

        avg_roi = sum(log.roi_percent for log in logs) / total_users if total_users > 0 else 0.0

        return {
            "total_users": total_users,
            "total_cost": round(total_cost, 2),
            "total_return": round(total_return, 2),
            "avg_roi": round(avg_roi, 2),
            "positive_roi_count": positive_roi_count,
        }

    @staticmethod
    def get_top_roi_campaigns(
        db: Session,
        limit: int = 10,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> list[dict[str, Any]]:
        """
        ROI 상위 캠페인 조회

        Args:
            db: DB 세션
            limit: 조회 개수
            start_date: 시작일
            end_date: 종료일

        Returns:
            list[dict]: 캠페인별 ROI 목록
        """
        query = db.query(
            V2RetentionRoiLog.event_type,
            func.count(V2RetentionRoiLog.id).label("user_count"),
            func.avg(V2RetentionRoiLog.roi_percent).label("avg_roi"),
            func.sum(V2RetentionRoiLog.marketing_cost).label("total_cost"),
            func.sum(V2RetentionRoiLog.predicted_ltv).label("total_return"),
        ).group_by(V2RetentionRoiLog.event_type)

        if start_date:
            query = query.filter(V2RetentionRoiLog.created_at >= start_date)
        if end_date:
            query = query.filter(V2RetentionRoiLog.created_at <= end_date)

        results = query.order_by(func.avg(V2RetentionRoiLog.roi_percent).desc()).limit(limit).all()

        return [
            {
                "event_type": row.event_type,
                "user_count": row.user_count,
                "avg_roi": round(row.avg_roi, 2) if row.avg_roi else 0.0,
                "total_cost": round(row.total_cost, 2) if row.total_cost else 0.0,
                "total_return": round(row.total_return, 2) if row.total_return else 0.0,
            }
            for row in results
        ]

    @staticmethod
    def calculate_daily_batch_roi(
        db: Session,
        target_date: datetime | None = None,
    ) -> dict[str, Any]:
        """
        일일 배치 ROI 계산 (Celery Task용)

        Args:
            db: DB 세션
            target_date: 대상 날짜 (None이면 어제)

        Returns:
            dict: 배치 실행 결과
        """
        if target_date is None:
            # 어제 날짜
            now_kst = business_day_start(offset_hours=-9)
            target_date = now_kst - timedelta(days=1)

        # 실제 구현 시:
        # 1. 어제 실행된 ops_execution 목록 조회
        # 2. 각 execution의 intervention_log 조회
        # 3. 각 유저별 24시간 ROI 계산
        # 4. v2_retention_roi_log에 저장

        # Placeholder
        processed_count = 0
        success_count = 0
        failed_count = 0

        return {
            "target_date": target_date.isoformat(),
            "processed_count": processed_count,
            "success_count": success_count,
            "failed_count": failed_count,
        }
