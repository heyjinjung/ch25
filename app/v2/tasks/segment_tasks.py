"""
User Segmentation Celery Tasks
"""
import logging
from app.worker.celery_app import celery_app
from app.db.session import SessionLocal
from app.v2.services.segment_service import V2SegmentService

logger = logging.getLogger(__name__)

@celery_app.task(name="app.v2.tasks.segment_tasks.execute_segment_batch_task")
def execute_segment_batch_task():
    """매일 새벽 1시 유저 세그먼트 배치 실행"""
    db = SessionLocal()
    try:
        logger.info("[Segment Task] Starting daily user segmentation batch")
        result = V2SegmentService.segment_all_users(db)
        logger.info(f"[Segment Task] Completed: {result}")
        return result
    except Exception as e:
        logger.error(f"[Segment Task] Failed: {str(e)}", exc_info=True)
        raise
    finally:
        db.close()
