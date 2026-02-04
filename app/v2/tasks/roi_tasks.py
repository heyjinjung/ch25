"""
ROI Analysis Celery Tasks
"""
import logging
from app.worker.celery_app import celery_app
from app.db.session import SessionLocal
from app.v2.services.roi_analysis_service import V2RoiAnalysisService

logger = logging.getLogger(__name__)

@celery_app.task(name="app.v2.tasks.roi_tasks.execute_roi_calculation_task")
def execute_roi_calculation_task():
    """매일 자정 ROI 집계 배치 실행"""
    db = SessionLocal()
    try:
        logger.info("[ROI Task] Starting daily ROI calculation batch")
        result = V2RoiAnalysisService.calculate_daily_batch_roi(db)
        logger.info(f"[ROI Task] Completed: {result}")
        return result
    except Exception as e:
        logger.error(f"[ROI Task] Failed: {str(e)}", exc_info=True)
        raise
    finally:
        db.close()
