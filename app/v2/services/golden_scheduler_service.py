"""
[DEPRECATED 2026-02-04] Golden Scheduler Service - 폐기됨

⚠️ 이 서비스는 더 이상 사용하지 않습니다.

폐기 사유:
- 복잡도 증가 대비 실익 불분명
- VIP/WHALE/AT_RISK 세그먼트 기반 자동 개입 로직 불필요

기존 기능:
- HQ 마진 데이터(세그먼트)를 기반으로 골든아워 개입 후보 자동 선정
- 24시간 중복 방지 로직

대체 방안:
- 어드민이 수동으로 골든아워 대상 유저 지정
- 또는 골든아워 기능 자체를 단순화

TODO: 이 파일 참조하는 코드 제거 후 파일 삭제
"""
from datetime import datetime, timedelta
import logging

from sqlalchemy import select, and_, or_
from sqlalchemy.orm import Session

from app.v2.models.user import V2User
from app.v2.models.v2_user_segment import V2UserSegment
from app.v2.models.v2_golden_intervention_log import V2GoldenInterventionLog

logger = logging.getLogger(__name__)


class GoldenSchedulerService:
    @staticmethod
    def run_golden_hour_check(db: Session) -> dict:
        """
        [DEPRECATED] 골든아워 자동 후보 선정 - 폐기됨 (2026-02-04)
        
        이 메서드는 더 이상 사용하지 않습니다.
        항상 빈 결과를 반환합니다.
        """
        logger.warning("GoldenSchedulerService.run_golden_hour_check() is DEPRECATED and does nothing.")
        return {
            "processed": 0,
            "triggered": 0,
            "skipped": 0,
            "deprecated": True,
            "message": "This feature is deprecated since 2026-02-04"
        }
