"""User Consistency Check Scripts.

유저 영역 정합성 검증을 위한 유틸리티 스크립트.
v2_user_segment 배치 동기화, v2_user-user 테이블 일관성 등을 점검합니다.

사용법:
    python scripts/user_consistency_check.py --check all
    python scripts/user_consistency_check.py --check segment
    python scripts/user_consistency_check.py --check migration
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import SessionLocal


def check_segment_sync(db) -> dict:
    """v2_user_segment 배치 동기화 상태 점검.
    
    최근 25시간 내 업데이트되지 않은 유저 수 확인.
    """
    # v2_user_segment 테이블 존재 여부 확인
    try:
        result = db.execute(text("""
            SELECT count(*) as stale_count
            FROM v2_user_segment 
            WHERE updated_at < NOW() - INTERVAL 25 HOUR
        """)).fetchone()
        stale_count = result.stale_count if result else 0
    except Exception as e:
        # 테이블이 없는 경우 user_segment 테이블로 fallback
        try:
            result = db.execute(text("""
                SELECT count(*) as stale_count
                FROM user_segment 
                WHERE updated_at < NOW() - INTERVAL 25 HOUR
            """)).fetchone()
            stale_count = result.stale_count if result else 0
        except Exception:
            return {"status": "ERROR", "message": f"세그먼트 테이블 조회 실패: {e}"}
    
    total_result = db.execute(text("""
        SELECT count(*) as total FROM user_segment
    """)).fetchone()
    total_count = total_result.total if total_result else 0
    
    status = "OK" if stale_count == 0 else "WARNING"
    return {
        "status": status,
        "stale_segment_users": stale_count,
        "total_segment_users": total_count,
        "message": f"최근 25시간 내 미업데이트 유저: {stale_count}명"
    }


def check_user_migration(db) -> dict:
    """user - v2_user 테이블 간 이관 누락 점검."""
    # user에는 있지만 v2_user에는 없는 유저 (이관 누락)
    try:
        result = db.execute(text("""
            SELECT count(*) as missing_count
            FROM user u
            LEFT JOIN v2_user v ON u.id = v.id
            WHERE v.id IS NULL
        """)).fetchone()
        missing_count = result.missing_count if result else 0
    except Exception as e:
        return {"status": "ERROR", "message": f"이관 점검 실패: {e}"}
    
    status = "OK" if missing_count == 0 else "WARNING"
    return {
        "status": status,
        "missing_v2_users": missing_count,
        "message": f"v2_user 미이관 유저: {missing_count}명"
    }


def check_benefits_suspended_users(db) -> dict:
    """7일간 무입금 유저 (benefits_suspended 대상) 현황 점검."""
    try:
        # 7일간 입금 0인 유저 수 확인
        result = db.execute(text("""
            SELECT count(DISTINCT u.id) as suspended_count
            FROM user u
            LEFT JOIN (
                SELECT user_id, SUM(deposit_delta) as total_deposit
                FROM external_ranking_daily_deposit_delta
                WHERE kst_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
                GROUP BY user_id
            ) d ON u.id = d.user_id
            WHERE COALESCE(d.total_deposit, 0) < 1
        """)).fetchone()
        suspended_count = result.suspended_count if result else 0
    except Exception as e:
        return {"status": "ERROR", "message": f"제재 대상 점검 실패: {e}"}
    
    return {
        "status": "INFO",
        "benefits_suspended_users": suspended_count,
        "message": f"7일간 무입금 유저 (제재 대상): {suspended_count}명"
    }


def check_index_health(db) -> dict:
    """핵심 인덱스 존재 여부 점검."""
    checks = []
    
    # v2_user_segment 인덱스
    try:
        result = db.execute(text("""
            SHOW INDEX FROM user_segment WHERE Key_name LIKE '%segment%'
        """)).fetchall()
        has_segment_idx = len(result) > 0
        checks.append(("user_segment.segment 인덱스", has_segment_idx))
    except Exception:
        checks.append(("user_segment.segment 인덱스", False))
    
    # exchange_log 인덱스
    try:
        result = db.execute(text("""
            SHOW INDEX FROM v2_exchange_log WHERE Key_name LIKE '%user_id%'
        """)).fetchall()
        has_exchange_idx = len(result) > 0
        checks.append(("v2_exchange_log.user_id 인덱스", has_exchange_idx))
    except Exception:
        checks.append(("v2_exchange_log.user_id 인덱스", "N/A (테이블 없음)"))
    
    all_ok = all(v is True for _, v in checks if v is not True and v != "N/A (테이블 없음)")
    return {
        "status": "OK" if all_ok else "WARNING",
        "checks": checks,
        "message": "인덱스 상태 점검 완료"
    }


def run_all_checks(db) -> dict:
    """모든 정합성 점검 실행."""
    return {
        "segment_sync": check_segment_sync(db),
        "user_migration": check_user_migration(db),
        "benefits_suspended": check_benefits_suspended_users(db),
        "index_health": check_index_health(db),
        "checked_at": datetime.utcnow().isoformat(),
    }


def main():
    parser = argparse.ArgumentParser(description="User Consistency Check")
    parser.add_argument("--check", choices=["all", "segment", "migration", "suspended", "index"], 
                        default="all", help="점검 항목 선택")
    args = parser.parse_args()
    
    db = SessionLocal()
    try:
        if args.check == "all":
            results = run_all_checks(db)
        elif args.check == "segment":
            results = {"segment_sync": check_segment_sync(db)}
        elif args.check == "migration":
            results = {"user_migration": check_user_migration(db)}
        elif args.check == "suspended":
            results = {"benefits_suspended": check_benefits_suspended_users(db)}
        elif args.check == "index":
            results = {"index_health": check_index_health(db)}
        
        import json
        print(json.dumps(results, indent=2, ensure_ascii=False, default=str))
        
    finally:
        db.close()


if __name__ == "__main__":
    main()
