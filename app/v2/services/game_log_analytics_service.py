"""Game Log Analytics Service for CSV-based revenue and risk analysis.

This service provides real-time analytics based on imported game log CSV data:
- Revenue/expense tracking (today, weekly)
- High roller detection (high-value bettors)
- Loss streak detection (churn risk)
- Opportunity user identification
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import List, Optional
from zoneinfo import ZoneInfo

from sqlalchemy import func, and_, case, desc
from sqlalchemy.orm import Session

from app.v2.models.v2_game_log import V2GameLog
from app.v2.models.user import V2User
from app.v2.models.v2_user_segment import V2UserSegment
from app.v2.models.hq_prospective_user import HQProspectiveUser

logger = logging.getLogger(__name__)

KST = ZoneInfo("Asia/Seoul")


def _today_kst_range() -> tuple[datetime, datetime]:
    """오늘 09:00 KST ~ 내일 08:59:59 KST (비즈니스 데이)"""
    now = datetime.now(KST)
    if now.hour < 9:
        # 자정~9시 사이면 어제 09:00이 오늘 시작
        today_start = now.replace(hour=9, minute=0, second=0, microsecond=0) - timedelta(days=1)
    else:
        today_start = now.replace(hour=9, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1) - timedelta(seconds=1)
    return today_start, today_end


def _this_week_kst_range() -> tuple[datetime, datetime]:
    """이번 주 월요일 09:00 KST ~ 다음 월요일 08:59:59 KST"""
    now = datetime.now(KST)
    if now.hour < 9:
        effective_day = now - timedelta(days=1)
    else:
        effective_day = now
    # 월요일 찾기 (weekday: 0=월 ... 6=일)
    days_since_monday = effective_day.weekday()
    week_start = effective_day.replace(hour=9, minute=0, second=0, microsecond=0) - timedelta(days=days_since_monday)
    week_end = week_start + timedelta(days=7) - timedelta(seconds=1)
    return week_start, week_end


def _last_week_kst_range() -> tuple[datetime, datetime]:
    """저번 주 월요일 09:00 KST ~ 이번 주 월요일 08:59:59 KST"""
    this_week_start, _ = _this_week_kst_range()
    last_week_start = this_week_start - timedelta(days=7)
    last_week_end = this_week_start - timedelta(seconds=1)
    return last_week_start, last_week_end


class GameLogAnalyticsService:
    """Game Log CSV 기반 실시간 분석 서비스."""

    def __init__(self, db: Session):
        self.db = db

    def get_today_revenue(self) -> dict:
        """
        오늘 수익/지출 계산 (Game Log 기반).
        
        비즈니스 로직:
        - 수익 = 총 배팅액 (유저가 건 돈)
        - 지출 = 총 지급액 (유저가 받은 돈)
        - 순수익 = 배팅 - 지급
        
        Returns:
            {
                "total_bet": int,        # 총 배팅액
                "total_payout": int,     # 총 지급액
                "net_revenue": int,      # 순수익 (배팅 - 지급)
                "bet_count": int,        # 배팅 건수
                "win_count": int,        # 승리 건수
                "lose_count": int,       # 패배 건수
                "jackpot_count": int,    # 잭팟 건수
                "unique_users": int,     # 고유 유저 수
            }
        """
        today_start, today_end = _today_kst_range()
        
        # 집계 쿼리
        stats = self.db.query(
            func.coalesce(func.sum(V2GameLog.bet_amount), 0).label("total_bet"),
            func.coalesce(func.sum(V2GameLog.payout_amount), 0).label("total_payout"),
            func.count(V2GameLog.id).label("bet_count"),
            func.sum(case((V2GameLog.result == "WIN", 1), else_=0)).label("win_count"),
            func.sum(case((V2GameLog.result == "LOSE", 1), else_=0)).label("lose_count"),
            func.sum(case((V2GameLog.result == "JACKPOT", 1), else_=0)).label("jackpot_count"),
            func.count(func.distinct(V2GameLog.user_id)).label("unique_users"),
        ).filter(
            V2GameLog.recorded_at >= today_start,
            V2GameLog.recorded_at <= today_end,
        ).first()
        
        total_bet = int(stats.total_bet or 0)
        total_payout = int(stats.total_payout or 0)
        
        return {
            "total_bet": total_bet,
            "total_payout": total_payout,
            "net_revenue": total_bet - total_payout,
            "bet_count": int(stats.bet_count or 0),
            "win_count": int(stats.win_count or 0),
            "lose_count": int(stats.lose_count or 0),
            "jackpot_count": int(stats.jackpot_count or 0),
            "unique_users": int(stats.unique_users or 0),
        }

    def get_weekly_revenue(self) -> dict:
        """이번 주 수익/지출 계산."""
        week_start, week_end = _this_week_kst_range()
        
        stats = self.db.query(
            func.coalesce(func.sum(V2GameLog.bet_amount), 0).label("total_bet"),
            func.coalesce(func.sum(V2GameLog.payout_amount), 0).label("total_payout"),
            func.count(V2GameLog.id).label("bet_count"),
            func.count(func.distinct(V2GameLog.user_id)).label("unique_users"),
        ).filter(
            V2GameLog.recorded_at >= week_start,
            V2GameLog.recorded_at <= week_end,
        ).first()
        
        total_bet = int(stats.total_bet or 0)
        total_payout = int(stats.total_payout or 0)
        
        return {
            "total_bet": total_bet,
            "total_payout": total_payout,
            "net_revenue": total_bet - total_payout,
            "bet_count": int(stats.bet_count or 0),
            "unique_users": int(stats.unique_users or 0),
        }

    def get_weekly_growth_rate(self) -> float:
        """
        주간 성장률 계산.
        
        Returns:
            float: (이번주 - 전주) / 전주 * 100 (%)
        """
        # 이번 주 수익
        this_week_start, this_week_end = _this_week_kst_range()
        this_week = self.db.query(
            func.coalesce(func.sum(V2GameLog.bet_amount - V2GameLog.payout_amount), 0)
        ).filter(
            V2GameLog.recorded_at >= this_week_start,
            V2GameLog.recorded_at <= this_week_end,
        ).scalar() or 0
        
        # 지난 주 수익
        last_week_start, last_week_end = _last_week_kst_range()
        last_week = self.db.query(
            func.coalesce(func.sum(V2GameLog.bet_amount - V2GameLog.payout_amount), 0)
        ).filter(
            V2GameLog.recorded_at >= last_week_start,
            V2GameLog.recorded_at <= last_week_end,
        ).scalar() or 0
        
        if last_week == 0:
            return 100.0 if this_week > 0 else 0.0
        
        return round(((this_week - last_week) / abs(last_week)) * 100, 2)

    def get_high_rollers(
        self,
        min_bet: int = 1_000_000,
        limit: int = 10,
    ) -> List[dict]:
        """
        오늘 고액 배팅 유저 조회.
        
        Args:
            min_bet: 최소 배팅액 기준 (기본 100만원)
            limit: 최대 결과 수
            
        Returns:
            [
                {
                    "user_id": int,
                    "nickname": str,
                    "total_bet": int,
                    "total_payout": int,
                    "win_rate": float,
                    "game_count": int,
                    "last_game_at": datetime,
                }
            ]
        """
        today_start, today_end = _today_kst_range()
        
        # 유저별 집계
        subq = self.db.query(
            V2GameLog.user_id,
            func.sum(V2GameLog.bet_amount).label("total_bet"),
            func.sum(V2GameLog.payout_amount).label("total_payout"),
            func.count(V2GameLog.id).label("game_count"),
            func.sum(case((V2GameLog.result.in_(["WIN", "JACKPOT"]), 1), else_=0)).label("win_count"),
            func.max(V2GameLog.recorded_at).label("last_game_at"),
        ).filter(
            V2GameLog.recorded_at >= today_start,
            V2GameLog.recorded_at <= today_end,
        ).group_by(
            V2GameLog.user_id
        ).having(
            func.sum(V2GameLog.bet_amount) >= min_bet
        ).subquery()
        
        # V2User join으로 닉네임 가져오기
        results = self.db.query(
            subq.c.user_id,
            V2User.nickname,
            subq.c.total_bet,
            subq.c.total_payout,
            subq.c.game_count,
            subq.c.win_count,
            subq.c.last_game_at,
        ).join(
            V2User, V2User.id == subq.c.user_id
        ).order_by(
            desc(subq.c.total_bet)
        ).limit(limit).all()
        
        high_rollers = []
        for row in results:
            win_rate = (row.win_count / row.game_count * 100) if row.game_count > 0 else 0.0
            high_rollers.append({
                "user_id": row.user_id,
                "nickname": row.nickname or f"User#{row.user_id}",
                "total_bet": int(row.total_bet),
                "total_payout": int(row.total_payout),
                "win_rate": round(win_rate, 1),
                "game_count": int(row.game_count),
                "last_game_at": row.last_game_at,
            })
        
        return high_rollers

    def detect_loss_streak_users(
        self,
        min_streak: int = 5,
        limit: int = 20,
    ) -> List[dict]:
        """
        연패 유저 감지 (이탈 위험).
        
        오늘 기록 중 마지막 N게임 연속 패배한 유저 추출.
        
        Args:
            min_streak: 최소 연패 횟수 (기본 5)
            limit: 최대 결과 수
            
        Returns:
            [
                {
                    "user_id": int,
                    "nickname": str,
                    "loss_streak": int,
                    "total_loss": int,
                    "last_game_at": datetime,
                    "risk_level": str,  # HIGH | MEDIUM
                }
            ]
        """
        today_start, today_end = _today_kst_range()
        
        # 오늘 게임 로그가 있는 유저 목록
        active_users = self.db.query(
            func.distinct(V2GameLog.user_id)
        ).filter(
            V2GameLog.recorded_at >= today_start,
            V2GameLog.recorded_at <= today_end,
        ).all()
        
        risk_users = []
        
        for (user_id,) in active_users:
            # 유저의 최근 게임 로그 (시간 역순)
            recent_logs = self.db.query(
                V2GameLog.result,
                V2GameLog.bet_amount,
                V2GameLog.payout_amount,
                V2GameLog.recorded_at,
            ).filter(
                V2GameLog.user_id == user_id,
                V2GameLog.recorded_at >= today_start,
                V2GameLog.recorded_at <= today_end,
            ).order_by(
                desc(V2GameLog.recorded_at)
            ).limit(20).all()
            
            if not recent_logs:
                continue
            
            # 연속 패배 계산 (가장 최근부터)
            loss_streak = 0
            total_loss = 0
            last_game_at = recent_logs[0].recorded_at
            
            for log in recent_logs:
                if log.result == "LOSE":
                    loss_streak += 1
                    total_loss += (log.bet_amount - log.payout_amount)
                else:
                    break  # 연속 패배 끊김
            
            if loss_streak >= min_streak:
                # 유저 정보 조회
                user = self.db.query(V2User.nickname).filter(V2User.id == user_id).first()
                nickname = user.nickname if user else f"User#{user_id}"
                
                # 위험 레벨 판단
                if loss_streak >= 8 or total_loss >= 500_000:
                    risk_level = "HIGH"
                else:
                    risk_level = "MEDIUM"
                
                risk_users.append({
                    "user_id": user_id,
                    "nickname": nickname,
                    "loss_streak": loss_streak,
                    "total_loss": int(total_loss),
                    "last_game_at": last_game_at,
                    "risk_level": risk_level,
                })
        
        # 위험도 순 정렬
        risk_users.sort(key=lambda x: (x["risk_level"] == "HIGH", x["loss_streak"]), reverse=True)
        
        return risk_users[:limit]

    def get_opportunity_users(self, limit: int = 10) -> List[dict]:
        """
        기회 유저 (VIP/WHALE 세그먼트) 상세 조회.
        
        HQ Margin CSV에서 분류된 VIP/WHALE 세그먼트 유저를
        상세 리스트로 반환.
        
        Returns:
            [
                {
                    "user_id": int,
                    "nickname": str,
                    "segment": str,  # VIP | WHALE
                    "total_margin": int,
                    "total_charge": int,
                    "last_activity_at": datetime,
                }
            ]
        """
        # V2UserSegment에서 VIP/WHALE 조회 (HQ 마진 데이터 포함)
        results = self.db.query(
            V2UserSegment.user_id,
            V2User.nickname,
            V2UserSegment.segment,
            V2UserSegment.total_margin,
            V2UserSegment.total_charge,
            V2User.last_login_at,
        ).join(
            V2User, V2User.id == V2UserSegment.user_id
        ).filter(
            V2UserSegment.segment.in_(["VIP", "WHALE"])
        ).order_by(
            desc(V2UserSegment.total_margin)
        ).limit(limit).all()
        
        opportunity_users = []
        for row in results:
            opportunity_users.append({
                "user_id": row.user_id,
                "nickname": row.nickname or f"User#{row.user_id}",
                "segment": row.segment,
                "total_margin": int(row.total_margin or 0),
                "total_charge": int(row.total_charge or 0),
                "last_activity_at": row.last_login_at,
            })
        
        return opportunity_users

    def get_risk_users(self, limit: int = 20) -> List[dict]:
        """
        위험 유저 통합 조회.
        
        여러 소스에서 위험 유저를 통합:
        1. 연패 감지 (Game Log)
        2. AT_RISK 세그먼트 (HQ Margin)
        
        Returns:
            [
                {
                    "user_id": int,
                    "nickname": str,
                    "risk_type": str,  # LOSS_STREAK | INACTIVE | BALANCE_DROP
                    "risk_level": str,  # HIGH | MEDIUM
                    "risk_score": float,
                    "details": dict,
                    "last_activity_at": datetime,
                }
            ]
        """
        risk_users = []
        
        # 1. 연패 감지 유저
        loss_streak_users = self.detect_loss_streak_users(min_streak=5, limit=limit // 2)
        for u in loss_streak_users:
            risk_users.append({
                "user_id": u["user_id"],
                "nickname": u["nickname"],
                "risk_type": "LOSS_STREAK",
                "risk_level": u["risk_level"],
                "risk_score": min(u["loss_streak"] / 10, 1.0),  # 0.0 ~ 1.0
                "details": {
                    "loss_streak": u["loss_streak"],
                    "total_loss": u["total_loss"],
                },
                "last_activity_at": u["last_game_at"],
            })
        
        # 2. AT_RISK 세그먼트 유저 (HQ에서 동기화된 inactive_days 사용)
        at_risk_users = self.db.query(
            V2UserSegment.user_id,
            V2User.nickname,
            V2UserSegment.inactive_days,
            V2UserSegment.total_margin,
            V2User.last_login_at,
        ).join(
            V2User, V2User.id == V2UserSegment.user_id
        ).filter(
            V2UserSegment.segment == "AT_RISK"
        ).order_by(
            desc(V2UserSegment.inactive_days)
        ).limit(limit // 2).all()
        
        for row in at_risk_users:
            # 이미 연패로 추가된 유저 제외
            if any(u["user_id"] == row.user_id for u in risk_users):
                continue
            
            inactive_days = row.inactive_days or 0
            risk_level = "HIGH" if inactive_days >= 14 else "MEDIUM"
            
            risk_users.append({
                "user_id": row.user_id,
                "nickname": row.nickname or f"User#{row.user_id}",
                "risk_type": "INACTIVE",
                "risk_level": risk_level,
                "risk_score": min(inactive_days / 30, 1.0),
                "details": {
                    "inactive_days": inactive_days,
                    "total_margin": int(row.total_margin or 0),
                },
                "last_activity_at": row.last_login_at,
            })
        
        # 위험도 순 정렬
        risk_users.sort(key=lambda x: (x["risk_level"] == "HIGH", x["risk_score"]), reverse=True)
        
        return risk_users[:limit]

    def get_revenue_summary(self) -> dict:
        """
        분석 대시보드용 수익 요약.
        
        데이터 소스 우선순위:
        1. HQ Margin CSV (V2UserSegment) - 실제 충전/환전 마진
        2. Game Log (V2GameLog) - 배팅/지급 데이터 (보조)
        
        Returns:
            {
                "today_revenue": int,       # HQ 총 운영 마진
                "today_expenses": int,      # HQ 총 환전액
                "net_income": int,          # 순수익
                "deposit_count": int,       # 동기화된 유저 수
                "weekly_growth_rate": float,# 주간 성장률
                "total_charge": int,        # HQ 총 충전액
                "data_source": str,         # 데이터 소스 표시
            }
        """
        # 1. HQ Margin 데이터 (Primary)
        hq_margin = self.get_hq_margin_summary()
        
        # 2. Game Log 데이터 (Secondary/보조)
        game_log = self.get_today_revenue()
        
        # 데이터 소스 결정: HQ Margin에 데이터가 있으면 HQ 기준
        has_hq_data = hq_margin.get("synced_users", 0) > 0
        
        if has_hq_data:
            return {
                "today_revenue": hq_margin.get("total_margin", 0),
                "today_expenses": hq_margin.get("total_withdrawal", 0),
                "net_income": hq_margin.get("total_margin", 0),  # margin = 순수익
                "deposit_count": hq_margin.get("synced_users", 0),
                "weekly_growth_rate": self.get_hq_weekly_growth_rate(),
                "total_charge": hq_margin.get("total_charge", 0),
                "data_source": "HQ_MARGIN",
            }
        else:
            # HQ 데이터 없으면 Game Log 사용
            return {
                "today_revenue": game_log["total_bet"],
                "today_expenses": game_log["total_payout"],
                "net_income": game_log["net_revenue"],
                "deposit_count": game_log["bet_count"],
                "weekly_growth_rate": self.get_weekly_growth_rate(),
                "total_charge": 0,
                "data_source": "GAME_LOG",
            }

    def get_hq_margin_summary(self) -> dict:
        """
        HQ Margin CSV 기반 전체 수익 통계.
        
        데이터 소스: V2UserSegment (total_margin, total_charge)
        
        Returns:
            {
                "total_margin": int,         # 전체 운영 마진 (충전 - 환전)
                "total_charge": int,         # 전체 충전액  
                "total_withdrawal": int,     # 전체 환전액 (charge - margin)
                "vip_count": int,            # VIP 유저 수
                "whale_count": int,          # WHALE 유저 수
                "at_risk_count": int,        # AT_RISK 유저 수
                "active_users": int,         # 7일 내 활성 유저
                "synced_users": int,         # HQ 동기화 유저 수
                "last_synced_at": datetime,  # 마지막 동기화 시각
            }
        """
        # 전체 마진/충전 집계
        totals = self.db.query(
            func.coalesce(func.sum(V2UserSegment.total_margin), 0).label("total_margin"),
            func.coalesce(func.sum(V2UserSegment.total_charge), 0).label("total_charge"),
            func.count(V2UserSegment.user_id).label("synced_users"),
            func.max(V2UserSegment.last_synced_at).label("last_synced_at"),
        ).filter(
            V2UserSegment.is_synced_from_hq == True
        ).first()
        
        total_margin = int(totals.total_margin or 0)
        total_charge = int(totals.total_charge or 0)
        total_withdrawal = total_charge - total_margin  # 환전 = 충전 - 마진
        
        # 세그먼트별 카운트
        segment_counts = self.db.query(
            V2UserSegment.segment,
            func.count(V2UserSegment.user_id).label("count")
        ).filter(
            V2UserSegment.is_synced_from_hq == True
        ).group_by(
            V2UserSegment.segment
        ).all()
        
        segment_map = {s.segment: s.count for s in segment_counts}
        
        # 활성 유저 (7일 내 inactive_days < 7)
        active_users = self.db.query(
            func.count(V2UserSegment.user_id)
        ).filter(
            V2UserSegment.is_synced_from_hq == True,
            V2UserSegment.inactive_days < 7
        ).scalar() or 0
        
        return {
            "total_margin": total_margin,
            "total_charge": total_charge,
            "total_withdrawal": total_withdrawal,
            "vip_count": segment_map.get("VIP", 0),
            "whale_count": segment_map.get("WHALE", 0),
            "at_risk_count": segment_map.get("AT_RISK", 0),
            "active_users": active_users,
            "synced_users": int(totals.synced_users or 0),
            "last_synced_at": totals.last_synced_at,
        }

    def get_hq_weekly_growth_rate(self) -> float:
        """
        HQ Margin 기반 주간 성장률 추정.
        
        Note: HQ CSV는 누적 데이터이므로, 실제 주간 변화량 계산은 제한적.
        현재는 active_users 비율과 margin 기반 추정치 반환.
        
        Returns:
            float: 추정 성장률 (%)
        """
        # HQ 데이터는 스냅샷이므로, 활성 유저 비율로 성장률 추정
        totals = self.db.query(
            func.count(V2UserSegment.user_id).label("total"),
            func.sum(case((V2UserSegment.inactive_days < 7, 1), else_=0)).label("active"),
        ).filter(
            V2UserSegment.is_synced_from_hq == True
        ).first()
        
        if not totals or totals.total == 0:
            return 0.0
        
        # 활성 비율 기반 성장률 (활성 비율 50% 초과 시 양수 성장으로 간주)
        active_ratio = (totals.active or 0) / totals.total
        estimated_growth = (active_ratio - 0.5) * 100 * 2  # -100% ~ +100% 스케일
        
        return round(estimated_growth, 2)


# Factory function
def get_game_log_analytics_service(db: Session) -> GameLogAnalyticsService:
    """Create GameLogAnalyticsService instance."""
    return GameLogAnalyticsService(db)
