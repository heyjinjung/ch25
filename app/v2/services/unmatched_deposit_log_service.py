"""Unmatched Deposit Log Service - HQ CSV 미매칭 입금 로그 관리.

설계 문서: v2_golden_hq_margin_cc_deposit_auto_reflection_design_ko.md
섹션 4, 7, 8 구현
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy import func, select, and_, or_
from sqlalchemy.orm import Session

from app.v2.models.v2_external_deposit_unmatched import (
    V2ExternalDepositUnmatched,
    UnmatchedStatus,
    UnmatchedReason,
)
from app.v2.models.user import V2User
from app.v2.services.prospect_linking_service import ProspectLinkingService
from app.v2.services.admin_cc_deposit_service import V2AdminCCDepositService
from app.v2.schemas.v2_cc_deposit import CCDepositCreate

logger = logging.getLogger(__name__)


class UnmatchedDepositLogService:
    """
    HQ Margin CSV Import 시 미매칭 입금 로그 관리 서비스.
    
    기능:
    1. 미매칭 로그 저장 (save_unmatched)
    2. 미매칭 로그 조회 (list_unmatched)
    3. 수동 매칭 + 즉시 CC Deposit 재처리 (link_to_user)
    4. 무시 처리 (ignore)
    5. 30일 보관 정책 cleanup (cleanup_old_logs)
    6. 통계 조회 (get_stats)
    """
    
    RETENTION_DAYS = 30
    
    def __init__(self, db: Session):
        self.db = db
    
    # ==================== KST 유틸리티 ====================
    
    @staticmethod
    def _kst_today() -> date:
        """KST 기준 오늘 날짜 반환."""
        try:
            from zoneinfo import ZoneInfo
            return datetime.now(ZoneInfo("Asia/Seoul")).date()
        except Exception:
            return datetime.utcnow().date()
    
    @staticmethod
    def _utc_now() -> datetime:
        """UTC 현재 시각 반환."""
        return datetime.utcnow()
    
    # ==================== 미매칭 로그 저장 ====================
    
    def save_unmatched(
        self,
        raw_cc_id: str,
        raw_nickname: Optional[str],
        total_charge: int,
        *,
        prev_total: int = 0,
        status: str = UnmatchedStatus.UNMATCHED.value,
        reason: str = UnmatchedReason.USER_NOT_FOUND.value,
        source: str = "HQ_MARGIN",
    ) -> V2ExternalDepositUnmatched:
        """
        미매칭 입금 로그 저장.
        
        Args:
            raw_cc_id: CSV 원본 CC ID
            raw_nickname: CSV 원본 닉네임
            total_charge: CSV 누적 충전 금액
            prev_total: 기존 누적 금액 (기매칭 유저가 있었던 경우)
            status: 상태 (UNMATCHED/AMBIGUOUS)
            reason: 실패 사유
            source: 소스 구분 (HQ_MARGIN)
            
        Returns:
            생성된 V2ExternalDepositUnmatched
        """
        delta = total_charge - prev_total if prev_total else total_charge
        
        log = V2ExternalDepositUnmatched(
            source=source,
            raw_cc_id=raw_cc_id,
            raw_nickname=raw_nickname,
            total_charge=total_charge,
            prev_total=prev_total,
            delta=max(delta, 0),  # 음수 방지
            kst_date=self._kst_today(),
            status=status,
            reason=reason,
            created_at=self._utc_now(),
            updated_at=self._utc_now(),
        )
        self.db.add(log)
        self.db.flush()
        
        logger.info(
            "Unmatched deposit log saved: cc_id=%s, total=%d, delta=%d, status=%s",
            raw_cc_id, total_charge, delta, status
        )
        return log
    
    # ==================== 미매칭 로그 조회 ====================
    
    def list_unmatched(
        self,
        hours: int = 24,
        status_filter: str = "UNMATCHED",
        limit: int = 50,
        offset: int = 0,
        include_suggestions: bool = True,
    ) -> tuple[list[dict], int, dict]:
        """
        미매칭 로그 조회 (유사 유저 제안 포함).
        
        Args:
            hours: 조회 기간 (시간)
            status_filter: 상태 필터 (UNMATCHED, AMBIGUOUS, ALL)
            limit: 페이지 크기
            offset: 오프셋
            include_suggestions: 유사 유저 제안 포함 여부
            
        Returns:
            (items, total, stats)
        """
        cutoff = self._utc_now() - timedelta(hours=hours)
        
        # 기본 쿼리
        query = select(V2ExternalDepositUnmatched).where(
            V2ExternalDepositUnmatched.created_at >= cutoff
        )
        
        # 상태 필터
        if status_filter == "ALL":
            pass
        elif status_filter == "AMBIGUOUS":
            query = query.where(V2ExternalDepositUnmatched.status == UnmatchedStatus.AMBIGUOUS.value)
        else:
            query = query.where(V2ExternalDepositUnmatched.status == UnmatchedStatus.UNMATCHED.value)
        
        # 총 건수
        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.execute(count_query).scalar() or 0
        
        # 페이징
        query = query.order_by(V2ExternalDepositUnmatched.created_at.desc())
        query = query.offset(offset).limit(limit)
        
        rows = self.db.execute(query).scalars().all()
        
        # 유사 유저 제안 추가
        items = []
        linking_service = ProspectLinkingService(self.db) if include_suggestions else None
        
        for row in rows:
            item = {
                "id": row.id,
                "source": row.source,
                "raw_cc_id": row.raw_cc_id,
                "raw_nickname": row.raw_nickname,
                "total_charge": row.total_charge,
                "prev_total": row.prev_total,
                "delta": row.delta,
                "kst_date": row.kst_date,
                "status": row.status,
                "reason": row.reason,
                "matched_user_id": row.matched_user_id,
                "matched_at": row.matched_at,
                "processed_at": row.processed_at,
                "admin_id": row.admin_id,
                "created_at": row.created_at,
                "suggestions": [],
            }
            
            # 유사 유저 제안 (UNMATCHED/AMBIGUOUS 상태만)
            if include_suggestions and linking_service and row.is_pending:
                search_key = row.raw_nickname or row.raw_cc_id
                similar_users = linking_service.find_similar_users(
                    search_key, min_similarity=0.5, limit=3
                )
                item["suggestions"] = [
                    {
                        "user_id": u["user_id"],
                        "nickname": u["nickname"],
                        "cc_id": getattr(
                            self.db.query(V2User).filter(V2User.id == u["user_id"]).first(),
                            "cc_id", None
                        ),
                        "similarity": round(u["similarity"] * 100, 1),
                    }
                    for u in similar_users
                ]
            
            items.append(item)
        
        # 통계 계산
        stats = self._calculate_list_stats(cutoff)
        
        return items, total, stats
    
    def _calculate_list_stats(self, cutoff: datetime) -> dict:
        """조회 결과 통계 계산."""
        base_query = select(
            V2ExternalDepositUnmatched.status,
            func.count().label("cnt")
        ).where(
            V2ExternalDepositUnmatched.created_at >= cutoff
        ).group_by(V2ExternalDepositUnmatched.status)
        
        rows = self.db.execute(base_query).all()
        status_counts = {row.status: row.cnt for row in rows}
        
        # 오늘 매칭된 건수
        today_start = datetime.combine(self._kst_today(), datetime.min.time())
        matched_today_query = select(func.count()).select_from(
            V2ExternalDepositUnmatched
        ).where(
            V2ExternalDepositUnmatched.status == UnmatchedStatus.MATCHED.value,
            V2ExternalDepositUnmatched.matched_at >= today_start,
        )
        matched_today = self.db.execute(matched_today_query).scalar() or 0
        
        return {
            "unmatched": status_counts.get(UnmatchedStatus.UNMATCHED.value, 0),
            "ambiguous": status_counts.get(UnmatchedStatus.AMBIGUOUS.value, 0),
            "matched_today": matched_today,
        }
    
    # ==================== 수동 매칭 + 즉시 재처리 ====================
    
    def link_to_user(
        self,
        unmatched_id: int,
        user_id: int,
        admin_id: int,
    ) -> dict:
        """
        미매칭 로그를 V2User에 수동 매칭하고 즉시 CC Deposit 재처리.
        
        Args:
            unmatched_id: 미매칭 로그 ID
            user_id: 매칭할 V2User ID
            admin_id: 처리한 어드민 ID
            
        Returns:
            {"success": bool, "message": str, "result": {...}}
            
        Raises:
            ValueError: 로그가 없거나 이미 처리된 경우
        """
        # 1. 로그 조회
        log = self.db.query(V2ExternalDepositUnmatched).filter(
            V2ExternalDepositUnmatched.id == unmatched_id
        ).first()
        
        if not log:
            raise ValueError("UNMATCHED_LOG_NOT_FOUND")
        
        if not log.is_pending:
            raise ValueError(f"ALREADY_PROCESSED: status={log.status}")
        
        # 2. V2User 확인
        user = self.db.query(V2User).filter(V2User.id == user_id).first()
        if not user:
            raise ValueError("USER_NOT_FOUND")
        
        # 3. 상태 업데이트
        now = self._utc_now()
        log.status = UnmatchedStatus.MATCHED.value
        log.matched_user_id = user_id
        log.matched_at = now
        log.admin_id = admin_id
        log.updated_at = now
        
        # 4. 즉시 CC Deposit 재처리
        try:
            payload = CCDepositCreate(
                user_id=user_id,
                deposit_amount=log.total_charge,
                play_count=0,
            )
            V2AdminCCDepositService.upsert_many(self.db, [payload])
            
            log.processed_at = self._utc_now()
            self.db.commit()
            
            # 결과 계산 (delta, XP 등)
            delta_applied = log.delta
            xp_granted = (delta_applied // 100_000) * 20  # 100,000원당 20XP
            
            # 세그먼트 조회
            from app.v2.models import V2UserSegment
            segment_row = self.db.query(V2UserSegment).filter(
                V2UserSegment.user_id == user_id
            ).first()
            segment = segment_row.segment if segment_row else None
            
            logger.info(
                "Manual linking completed: unmatched_id=%d -> user_id=%d, delta=%d, xp=%d",
                unmatched_id, user_id, delta_applied, xp_granted
            )
            
            return {
                "success": True,
                "message": "매칭 및 CC 입금 처리 완료",
                "result": {
                    "user_id": user_id,
                    "deposit_amount": log.total_charge,
                    "delta_applied": delta_applied,
                    "xp_granted": xp_granted,
                    "segment": segment,
                }
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(
                "Manual linking failed: unmatched_id=%d, user_id=%d, error=%s",
                unmatched_id, user_id, str(e)
            )
            raise ValueError(f"CC_DEPOSIT_FAILED: {str(e)}")
    
    # ==================== 무시 처리 ====================
    
    def ignore(
        self,
        unmatched_id: int,
        reason: str,
        admin_id: int,
    ) -> dict:
        """
        미매칭 로그 무시 처리.
        
        Args:
            unmatched_id: 미매칭 로그 ID
            reason: 무시 사유
            admin_id: 처리한 어드민 ID
            
        Returns:
            {"success": bool, "message": str}
        """
        log = self.db.query(V2ExternalDepositUnmatched).filter(
            V2ExternalDepositUnmatched.id == unmatched_id
        ).first()
        
        if not log:
            raise ValueError("UNMATCHED_LOG_NOT_FOUND")
        
        if not log.is_pending:
            raise ValueError(f"ALREADY_PROCESSED: status={log.status}")
        
        now = self._utc_now()
        log.status = UnmatchedStatus.IGNORED.value
        log.reason = reason
        log.admin_id = admin_id
        log.updated_at = now
        
        self.db.commit()
        
        logger.info(
            "Unmatched log ignored: id=%d, reason=%s, admin=%d",
            unmatched_id, reason, admin_id
        )
        
        return {
            "success": True,
            "message": "미매칭 로그가 무시 처리되었습니다.",
        }
    
    # ==================== 통계 조회 ====================
    
    def get_stats(self) -> dict:
        """
        미매칭 로그 전체 통계 조회.
        
        Returns:
            {
                "total_unmatched": int,
                "total_ambiguous": int,
                "matched_last_24h": int,
                "ignored_last_24h": int,
                "pending_by_source": {"HQ_MARGIN": int},
                "top_reasons": [{"reason": str, "count": int}]
            }
        """
        # 상태별 전체 건수 (pending만)
        pending_query = select(
            V2ExternalDepositUnmatched.status,
            func.count().label("cnt")
        ).where(
            V2ExternalDepositUnmatched.status.in_([
                UnmatchedStatus.UNMATCHED.value,
                UnmatchedStatus.AMBIGUOUS.value,
            ])
        ).group_by(V2ExternalDepositUnmatched.status)
        
        pending_rows = self.db.execute(pending_query).all()
        pending_counts = {row.status: row.cnt for row in pending_rows}
        
        # 24시간 내 처리 건수
        cutoff_24h = self._utc_now() - timedelta(hours=24)
        
        matched_24h = self.db.execute(
            select(func.count()).select_from(V2ExternalDepositUnmatched).where(
                V2ExternalDepositUnmatched.status == UnmatchedStatus.MATCHED.value,
                V2ExternalDepositUnmatched.matched_at >= cutoff_24h,
            )
        ).scalar() or 0
        
        ignored_24h = self.db.execute(
            select(func.count()).select_from(V2ExternalDepositUnmatched).where(
                V2ExternalDepositUnmatched.status == UnmatchedStatus.IGNORED.value,
                V2ExternalDepositUnmatched.updated_at >= cutoff_24h,
            )
        ).scalar() or 0
        
        # 소스별 pending 건수
        source_query = select(
            V2ExternalDepositUnmatched.source,
            func.count().label("cnt")
        ).where(
            V2ExternalDepositUnmatched.status.in_([
                UnmatchedStatus.UNMATCHED.value,
                UnmatchedStatus.AMBIGUOUS.value,
            ])
        ).group_by(V2ExternalDepositUnmatched.source)
        
        source_rows = self.db.execute(source_query).all()
        pending_by_source = {row.source: row.cnt for row in source_rows}
        
        # Top reasons
        reason_query = select(
            V2ExternalDepositUnmatched.reason,
            func.count().label("cnt")
        ).where(
            V2ExternalDepositUnmatched.status.in_([
                UnmatchedStatus.UNMATCHED.value,
                UnmatchedStatus.AMBIGUOUS.value,
            ]),
            V2ExternalDepositUnmatched.reason.isnot(None),
        ).group_by(V2ExternalDepositUnmatched.reason).order_by(
            func.count().desc()
        ).limit(5)
        
        reason_rows = self.db.execute(reason_query).all()
        top_reasons = [{"reason": row.reason, "count": row.cnt} for row in reason_rows]
        
        return {
            "total_unmatched": pending_counts.get(UnmatchedStatus.UNMATCHED.value, 0),
            "total_ambiguous": pending_counts.get(UnmatchedStatus.AMBIGUOUS.value, 0),
            "matched_last_24h": matched_24h,
            "ignored_last_24h": ignored_24h,
            "pending_by_source": pending_by_source,
            "top_reasons": top_reasons,
        }
    
    # ==================== 30일 보관 정책 ====================
    
    def cleanup_old_logs(self) -> int:
        """
        30일 이전의 처리 완료된 로그 삭제.
        
        Returns:
            삭제된 건수
        """
        cutoff = self._utc_now() - timedelta(days=self.RETENTION_DAYS)
        
        # MATCHED/IGNORED 상태의 오래된 로그만 삭제
        delete_query = self.db.query(V2ExternalDepositUnmatched).filter(
            V2ExternalDepositUnmatched.created_at < cutoff,
            V2ExternalDepositUnmatched.status.in_([
                UnmatchedStatus.MATCHED.value,
                UnmatchedStatus.IGNORED.value,
            ])
        )
        
        count = delete_query.count()
        if count > 0:
            delete_query.delete(synchronize_session=False)
            self.db.commit()
            
            logger.info(
                "Cleaned up %d old unmatched deposit logs (older than %d days)",
                count, self.RETENTION_DAYS
            )
        
        return count
