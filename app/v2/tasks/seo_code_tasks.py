"""
SEO 일일 코드 생성 Celery Task

매일 09:00 KST에 Celery Beat를 통해 실행:
- 기존 활성 코드 비활성화
- 오늘 날짜(KST)의 새 SEO 코드 생성
"""
from __future__ import annotations

import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from app.worker.celery_app import celery_app
from app.db.session import SessionLocal
from app.v2.services.seo_code_service import V2SeoCodeService

logger = logging.getLogger(__name__)

KST = ZoneInfo("Asia/Seoul")


@celery_app.task(name="app.v2.tasks.seo_code_tasks.generate_seo_daily_code_task")
def generate_seo_daily_code_task() -> dict:
    """
    SEO 일일 검색 미션 코드 생성 (Celery Task)

    동작:
      1. 오늘 날짜(KST)의 기존 코드가 있으면 재활용
      2. 없으면 새 코드(SEO + 랜덤 5자리) 생성
      3. 이전 날짜의 활성 코드 비활성화

    Returns:
        {"success": True, "date": "2026-02-13", "code": "SEOAB1C2"}
    """
    db = SessionLocal()
    try:
        today_kst = datetime.now(KST).date()
        new_code = V2SeoCodeService.generate_daily_code(db, today_kst)

        logger.info(
            "[SEO] daily code generated: date=%s code=%s",
            today_kst, new_code.code,
        )
        return {
            "success": True,
            "date": str(today_kst),
            "code": new_code.code,
        }
    except Exception as e:
        logger.error("[SEO] daily code generation failed: %s", e, exc_info=True)
        db.rollback()
        return {"success": False, "error": str(e)}
    finally:
        db.close()
