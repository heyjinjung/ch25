"""
V2 Daily Nudge Service

일일 넛지 (Daily Nudge) 서비스:
- 리텐션 유지를 위한 일일 무료 토큰 자동 발송
- 최근 3일 내 접속했으나 오늘 접속 안 한 유저 타겟팅
- benefits_suspended (7일 무입금) 유저 제외
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.v2.models.user import V2User
from app.v2.models import UserActivity, GameTokenType
from app.v2.services.inventory_service import V2InventoryService
from app.v2.services.vault_service import V2VaultService
from app.utils.timezone import business_day_start


class DailyNudgeService:
    """일일 넛지 서비스"""

    @staticmethod
    def get_nudge_target_users(
        db: Session,
        lookback_days: int = 3,
        kst_hour: int = 9,
    ) -> list[tuple[int, str]]:
        """
        넛지 대상 유저 조회

        조건:
        1. 최근 {lookback_days}일 내 접속 기록이 있음
        2. 오늘(운영일 기준) 접속 안 함
        3. benefits_suspended가 아님 (7일 무입금 유저 제외)

        Args:
            db: DB 세션
            lookback_days: 최근 접속 확인 기간 (기본 3일)
            kst_hour: 운영일 시작 시각 (기본 9시)

        Returns:
            list[tuple[int, str]]: (user_id, cc_id) 리스트
        """
        now_kst = business_day_start(offset_hours=-kst_hour)  # 현재 운영일 시작 시각
        today_start = now_kst
        lookback_start = today_start - timedelta(days=lookback_days)

        # 1. 최근 lookback_days일 내 접속한 유저
        recent_active_users = (
            db.query(UserActivity.user_id)
            .filter(
                and_(
                    UserActivity.last_login_at >= lookback_start,
                    UserActivity.last_login_at < today_start,  # 오늘은 제외
                )
            )
            .subquery()
        )

        # 2. V2User 중 benefits_suspended가 아닌 유저
        query = (
            db.query(V2User.id, V2User.cc_id)
            .filter(
                V2User.id.in_(select(recent_active_users.c.user_id))
            )
        )

        # 3. 7일 무입금 유저 제외 (benefits_suspended)
        target_users = []
        for user_id, cc_id in query.all():
            user = db.get(V2User, user_id)
            if not user:
                continue

            # benefits_suspended 체크
            is_suspended, _ = V2VaultService.is_benefits_suspended(user)
            if is_suspended:
                continue

            target_users.append((user_id, cc_id))

        return target_users

    @staticmethod
    def send_daily_nudge(
        db: Session,
        user_id: int,
        ticket_amount: int = 3,
        skip_suspension_check: bool = False,
    ) -> dict[str, Any]:
        """
        일일 넛지 발송

        Args:
            db: DB 세션
            user_id: 유저 ID
            ticket_amount: 지급할 티켓 수 (기본 1장)
            skip_suspension_check: 제재 체크 스킵 여부 (관리자용)

        Returns:
            dict: 발송 결과
                - success: bool
                - user_id: int
                - ticket_granted: int
                - message: str
        """
        user = db.get(V2User, user_id)
        if not user:
            return {
                "success": False,
                "user_id": user_id,
                "ticket_granted": 0,
                "message": "USER_NOT_FOUND",
            }

        # benefits_suspended 체크 (관리자가 아닌 경우)
        if not skip_suspension_check:
            is_suspended, _ = V2VaultService.is_benefits_suspended(user)
            if is_suspended:
                return {
                    "success": False,
                    "user_id": user_id,
                    "ticket_granted": 0,
                    "message": "BENEFITS_SUSPENDED",
                }

        # TRIAL_TICKET 지급
        try:
            V2InventoryService.grant_wallet_tokens(
                db=db,
                v2_user_id=user_id,
                token_type=GameTokenType.TRIAL_TICKET,
                amount=ticket_amount,
                reason="daily_nudge",
            )

            return {
                "success": True,
                "user_id": user_id,
                "ticket_granted": ticket_amount,
                "message": "TICKET_GRANTED",
            }
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "user_id": user_id,
                "ticket_granted": 0,
                "message": f"GRANT_FAILED: {str(e)}",
            }

    @staticmethod
    def execute_daily_nudge_batch(
        db: Session,
        lookback_days: int = 3,
        ticket_amount: int = 1,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        """
        일일 넛지 배치 실행

        Args:
            db: DB 세션
            lookback_days: 최근 접속 확인 기간 (기본 3일)
            ticket_amount: 지급할 티켓 수 (기본 1장)
            dry_run: True면 실제 지급 없이 대상자만 조회

        Returns:
            dict: 배치 실행 결과
                - total_targets: int (대상자 수)
                - success_count: int (성공 건수)
                - failed_count: int (실패 건수)
                - suspended_count: int (제재 유저 수)
                - results: list[dict] (개별 결과)
        """
        # 대상 유저 조회
        target_users = DailyNudgeService.get_nudge_target_users(
            db, lookback_days=lookback_days
        )

        if dry_run:
            return {
                "total_targets": len(target_users),
                "success_count": 0,
                "failed_count": 0,
                "suspended_count": 0,
                "dry_run": True,
                "targets": [{"user_id": uid, "cc_id": cc_id} for uid, cc_id in target_users],
            }

        # 실제 발송
        results = []
        success_count = 0
        failed_count = 0
        suspended_count = 0

        for user_id, cc_id in target_users:
            result = DailyNudgeService.send_daily_nudge(
                db, user_id, ticket_amount=ticket_amount
            )
            results.append(result)

            if result["success"]:
                success_count += 1
            elif result["message"] == "BENEFITS_SUSPENDED":
                suspended_count += 1
            else:
                failed_count += 1

        return {
            "total_targets": len(target_users),
            "success_count": success_count,
            "failed_count": failed_count,
            "suspended_count": suspended_count,
            "dry_run": False,
            "results": results,
        }

    @staticmethod
    def get_nudge_statistics(
        db: Session,
        lookback_days: int = 7,
    ) -> dict[str, Any]:
        """
        넛지 통계 조회 (어드민용)

        Args:
            db: DB 세션
            lookback_days: 통계 기간 (기본 7일)

        Returns:
            dict: 넛지 통계
                - total_inactive_users: int (비활성 유저 수)
                - eligible_users: int (넛지 대상 유저 수)
                - suspended_users: int (제재 유저 수)
        """
        now_kst = business_day_start(offset_hours=-9)
        today_start = now_kst
        lookback_start = today_start - timedelta(days=lookback_days)

        # 최근 lookback_days일 내 접속했으나 오늘 접속 안 한 유저
        inactive_count = (
            db.query(func.count(UserActivity.user_id))
            .filter(
                and_(
                    UserActivity.last_login_at >= lookback_start,
                    UserActivity.last_login_at < today_start,
                )
            )
            .scalar()
        )

        # 넛지 대상 유저 (제재 제외)
        target_users = DailyNudgeService.get_nudge_target_users(db, lookback_days=3)

        # 제재 유저 수 (7일 무입금)
        all_users_count = db.query(func.count(V2User.id)).scalar()
        suspended_count = 0
        for user in db.query(V2User).all():
            is_suspended, _ = V2VaultService.is_benefits_suspended(user)
            if is_suspended:
                suspended_count += 1

        return {
            "total_inactive_users": inactive_count or 0,
            "eligible_users": len(target_users),
            "suspended_users": suspended_count,
            "lookback_days": lookback_days,
        }
