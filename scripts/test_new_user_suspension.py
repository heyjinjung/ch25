"""신규 유저 제재 면제 정책 검증 스크립트

테스트 유저: user_id=20 (@jm956)
- 가입일: 2026-02-04 21:02:10 (UTC)
- 현재 시각: 2026-02-05 08:36 (약 11시간 경과)
- 최근 7일 입금: 0원

예상 결과: is_benefits_suspended = False (가입 7일 미만이므로 제재 면제)
"""

import sys
from pathlib import Path

# 프로젝트 루트 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.database import get_db_session
from app.v2.services.vault_service import V2VaultService


def test_new_user_suspension():
    print("=" * 80)
    print("🧪 신규 유저 제재 면제 정책 검증")
    print("=" * 80)
    
    test_user_id = 20
    
    with get_db_session() as db:
        # 1. 유저 정보 확인
        from app.v2.models import V2User
        user = db.query(V2User).filter(V2User.id == test_user_id).first()
        
        if not user:
            print(f"❌ 유저를 찾을 수 없습니다: user_id={test_user_id}")
            return
        
        print(f"\n📋 유저 정보:")
        print(f"  - User ID: {user.id}")
        print(f"  - Telegram ID: {user.telegram_id}")
        print(f"  - Username: @{user.telegram_username}")
        print(f"  - 가입일: {user.created_at}")
        
        # 2. 경과일 계산
        now_utc = datetime.now(timezone.utc)
        created_at = user.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        
        days_since_signup = (now_utc - created_at).days
        hours_since_signup = (now_utc - created_at).total_seconds() / 3600
        
        print(f"\n⏱️  경과 시간:")
        print(f"  - 현재 시각: {now_utc}")
        print(f"  - 가입 경과: {days_since_signup}일 ({hours_since_signup:.1f}시간)")
        
        # 3. 최근 7일 입금 확인
        from app.v2.models import ExternalRankingDailyDepositDelta
        from sqlalchemy import func
        from datetime import timedelta
        
        seven_days_ago = (now_utc - timedelta(days=6)).date()
        deposit_7d = db.query(
            func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0)
        ).filter(
            ExternalRankingDailyDepositDelta.user_id == test_user_id,
            ExternalRankingDailyDepositDelta.kst_date >= seven_days_ago,
        ).scalar() or 0
        
        print(f"\n💰 최근 7일 입금:")
        print(f"  - 기준: {seven_days_ago} ~ 오늘")
        print(f"  - 입금 합계: {deposit_7d:,}원")
        
        # 4. is_benefits_suspended 실행
        print(f"\n🔍 제재 상태 확인:")
        is_suspended, deposit_check = V2VaultService.is_benefits_suspended(db, test_user_id, now_utc)
        
        print(f"  - is_benefits_suspended: {is_suspended}")
        print(f"  - deposit_7d (함수 반환값): {deposit_check:,}원")
        
        # 5. 결과 검증
        print(f"\n{'=' * 80}")
        print("✅ 검증 결과:")
        print(f"{'=' * 80}")
        
        if days_since_signup < 7:
            expected = False
            reason = f"가입 {days_since_signup}일 차 (7일 미만) → 제재 면제 정책 적용"
            
            if is_suspended == expected:
                print(f"✅ PASS: {reason}")
                print(f"   → is_benefits_suspended = {is_suspended} (예상: {expected})")
            else:
                print(f"❌ FAIL: 예상과 다른 결과!")
                print(f"   → 예상: {expected}")
                print(f"   → 실제: {is_suspended}")
                print(f"   → 이유: {reason}")
        else:
            expected = deposit_7d < 1
            reason = f"가입 {days_since_signup}일 차 (7일 이상) + 최근 7일 입금 {deposit_7d}원"
            
            if is_suspended == expected:
                print(f"✅ PASS: {reason}")
                print(f"   → is_benefits_suspended = {is_suspended} (예상: {expected})")
            else:
                print(f"❌ FAIL: 예상과 다른 결과!")
                print(f"   → 예상: {expected}")
                print(f"   → 실제: {is_suspended}")
                print(f"   → 이유: {reason}")
        
        print(f"\n{'=' * 80}")
        print("📝 정책 요약:")
        print(f"{'=' * 80}")
        print("1. 가입 7일 이내 유저는 입금 여부와 무관하게 제재 면제")
        print("2. 가입 7일 이후부터는 최근 7일 입금이 0원이면 제재")
        print("3. Latency Survival: 24시간 내 임시 증거가 있으면 예외 허용")
        print(f"{'=' * 80}")


if __name__ == "__main__":
    try:
        test_new_user_suspension()
    except Exception as e:
        print(f"\n❌ 에러 발생: {e}")
        import traceback
        traceback.print_exc()
