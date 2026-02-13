#!/usr/bin/env python3
"""SEO 일일 코드 교체 스크립트.

Cron 등록 (매일 09:00 KST):
    0 9 * * * /usr/bin/python3 /path/to/scripts/rotate_seo_daily_code.py

동작:
    1. 기존 활성 코드 비활성화
    2. 오늘 날짜(KST)의 새 코드 생성 (SEO + 랜덤 5자리)
    3. DB 커밋
"""
import sys
import os

# 프로젝트 루트를 sys.path에 추가 (Cron에서 직접 실행 시 필요)
# scripts/ 폴더의 상위 폴더(ch25/)를 sys.path에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from zoneinfo import ZoneInfo

from app.db.session import SessionLocal  # DB 세션 팩토리
from app.v2.services.seo_code_service import V2SeoCodeService

KST = ZoneInfo("Asia/Seoul")


def main():
    today_kst = datetime.now(KST).date()
    db = SessionLocal()

    try:
        new_code = V2SeoCodeService.generate_daily_code(db, today_kst)
        print(f"[OK] {today_kst} SEO 코드 생성 완료: {new_code.code}")
    except Exception as e:
        print(f"[ERROR] SEO 코드 생성 실패: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
