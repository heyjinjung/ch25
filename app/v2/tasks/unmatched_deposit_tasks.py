"""
Unmatched Deposit Log Cleanup Celery Tasks

설계 문서: v2_golden_hq_margin_cc_deposit_auto_reflection_design_ko.md
30일 보관 정책 구현
"""
import logging
from app.worker.celery_app import celery_app
from app.db.session import SessionLocal
from app.v2.services.unmatched_deposit_log_service import UnmatchedDepositLogService

logger = logging.getLogger(__name__)


@celery_app.task(name="app.v2.tasks.unmatched_deposit_tasks.cleanup_old_unmatched_logs_task")
def cleanup_old_unmatched_logs_task():
    """
    30일 이전의 처리 완료된 미매칭 로그 정리 태스크.
    
    매일 새벽 2시 실행 권장 (Celery Beat).
    MATCHED/IGNORED 상태의 오래된 로그만 삭제.
    """
    db = SessionLocal()
    try:
        logger.info("[Unmatched Cleanup Task] Starting cleanup of old unmatched deposit logs")
        
        service = UnmatchedDepositLogService(db)
        deleted_count = service.cleanup_old_logs()
        
        result = {
            "deleted_count": deleted_count,
            "retention_days": service.RETENTION_DAYS,
        }
        
        logger.info(f"[Unmatched Cleanup Task] Completed: deleted {deleted_count} logs")
        return result
        
    except Exception as e:
        logger.error(f"[Unmatched Cleanup Task] Failed: {str(e)}", exc_info=True)
        raise
    finally:
        db.close()
