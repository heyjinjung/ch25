"""
Daily Nudge Celery Tasks

일일 넛지 스케줄러용 Celery Task:
- Celery Beat를 통한 스케줄 실행
- 매일 12:00, 18:00 KST 실행
"""
from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.worker.celery_app import celery_app
from app.db.session import SessionLocal
from app.v2.services.daily_nudge_service import DailyNudgeService

logger = logging.getLogger(__name__)


@celery_app.task(name="app.v2.tasks.daily_nudge_tasks.execute_daily_nudge_task")
def execute_daily_nudge_task(
    lookback_days: int = 3,
    ticket_amount: int = 1,
    dry_run: bool = False,
) -> dict:
    """
    일일 넛지 배치 실행 (Celery Task)

    Args:
        lookback_days: 최근 접속 확인 기간 (기본 3일)
        ticket_amount: 지급할 티켓 수 (기본 1장)
        dry_run: True면 실제 지급 없이 대상자만 조회

    Returns:
        dict: 배치 실행 결과
    """
    db: Session = SessionLocal()
    try:
        logger.info(
            f"[Daily Nudge] Starting batch execution "
            f"(lookback_days={lookback_days}, ticket_amount={ticket_amount}, dry_run={dry_run})"
        )

        result = DailyNudgeService.execute_daily_nudge_batch(
            db=db,
            lookback_days=lookback_days,
            ticket_amount=ticket_amount,
            dry_run=dry_run,
        )

        logger.info(
            f"[Daily Nudge] Batch completed: "
            f"targets={result['total_targets']}, "
            f"success={result['success_count']}, "
            f"failed={result['failed_count']}, "
            f"suspended={result['suspended_count']}"
        )

        return result
    except Exception as e:
        logger.error(f"[Daily Nudge] Batch execution failed: {str(e)}", exc_info=True)
        db.rollback()
        raise
    finally:
        db.close()


# Celery Beat Schedule Configuration (celerybeat-schedule.py에서 사용)
DAILY_NUDGE_SCHEDULE = {
    "daily-nudge-noon": {
        "task": "app.v2.tasks.daily_nudge_tasks.execute_daily_nudge_task",
        "schedule": {
            "hour": 12,
            "minute": 0,
            "day_of_week": "*",
        },  # 매일 12:00 KST
        "args": (3, 1, False),  # (lookback_days, ticket_amount, dry_run)
    },
    "daily-nudge-evening": {
        "task": "app.v2.tasks.daily_nudge_tasks.execute_daily_nudge_task",
        "schedule": {
            "hour": 18,
            "minute": 0,
            "day_of_week": "*",
        },  # 매일 18:00 KST
        "args": (3, 1, False),
    },
}
