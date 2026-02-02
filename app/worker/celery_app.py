from celery import Celery
from celery.schedules import crontab
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "xmas_worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.v2.tasks.daily_nudge_tasks",
        "app.v2.tasks.roi_tasks",
        "app.v2.tasks.segment_tasks",
        "app.v2.tasks.unmatched_deposit_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Seoul",
    enable_utc=False,
    # Celery Beat 스케줄 설정
    beat_schedule={
        "daily-nudge-noon": {
            "task": "app.v2.tasks.daily_nudge_tasks.execute_daily_nudge_task",
            "schedule": crontab(hour=12, minute=0),  # 매일 12:00 KST
            "args": (3, 1, False),  # (lookback_days, ticket_amount, dry_run)
        },
        "daily-nudge-evening": {
            "task": "app.v2.tasks.daily_nudge_tasks.execute_daily_nudge_task",
            "schedule": crontab(hour=18, minute=0),  # 매일 18:00 KST
            "args": (3, 1, False),
        },
        "daily-roi-midnight": {
            "task": "app.v2.tasks.roi_tasks.execute_roi_calculation_task",
            "schedule": crontab(hour=0, minute=0),  # 매일 00:00 KST
        },
        "segment-batch-early-morning": {
            "task": "app.v2.tasks.segment_tasks.execute_segment_batch_task",
            "schedule": crontab(hour=1, minute=0),  # 매일 01:00 KST
        },
        "unmatched-deposit-cleanup": {
            "task": "app.v2.tasks.unmatched_deposit_tasks.cleanup_old_unmatched_logs_task",
            "schedule": crontab(hour=2, minute=0),  # 매일 02:00 KST
        },
    },
)

if __name__ == "__main__":
    celery_app.start()
