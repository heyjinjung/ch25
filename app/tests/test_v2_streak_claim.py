"""
V2 Streak Claim 기능 테스트

목적:
- user_id=1의 streak_info가 올바르게 반환되는지 확인
- claimable_day와 claimable_rewards가 제대로 설정되는지 검증
"""

import sys
from pathlib import Path

# 프로젝트 루트를 sys.path에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.db.session import SessionLocal
from app.v2.services.mission_service import V2MissionService
from app.v2.models.user import V2User

def test_streak_info():
    """user_id=1의 streak_info 확인"""
    print("=" * 60)
    print("V2 Streak Claim 테스트 시작")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # 1. V2User 확인
        user = db.query(V2User).filter(V2User.id == 1).first()
        if not user:
            print("❌ ERROR: user_id=1이 존재하지 않습니다.")
            return
        
        print(f"\n✅ V2User 확인:")
        print(f"   - user_id: {user.id}")
        print(f"   - play_streak: {user.play_streak}")
        print(f"   - last_play_date: {user.last_play_date}")
        
        # 2. MissionService 테스트
        service = V2MissionService(db)
        
        # 3. pending_streak_milestone 확인
        pending = service.get_pending_streak_milestone(1)
        print(f"\n✅ Pending Streak Milestone:")
        print(f"   - pending_milestone: {pending}")
        
        # 4. streak_info 확인
        info = service.get_streak_info(1)
        print(f"\n✅ Streak Info:")
        print(f"   - current_streak: {info.current_streak}")
        print(f"   - current_multiplier: {info.current_multiplier}")
        print(f"   - is_hot: {info.is_hot}")
        print(f"   - is_legend: {info.is_legend}")
        print(f"   - next_milestone: {info.next_milestone}")
        print(f"   - claimable_day: {info.claimable_day}")
        print(f"   - claimable_rewards: {info.claimable_rewards}")
        
        # 5. 검증
        print("\n" + "=" * 60)
        print("검증 결과:")
        print("=" * 60)
        
        if info.current_streak >= 1:
            print(f"✅ current_streak = {info.current_streak} (1 이상)")
        else:
            print(f"❌ current_streak = {info.current_streak} (0)")
        
        if info.claimable_day is not None:
            print(f"✅ claimable_day = {info.claimable_day}")
        else:
            print(f"⚠️  claimable_day = None (클레임 가능한 보상 없음)")
        
        if len(info.claimable_rewards) > 0:
            print(f"✅ claimable_rewards = {info.claimable_rewards}")
        else:
            print(f"⚠️  claimable_rewards = [] (빈 배열)")
        
        # 6. 프론트엔드 매핑 시뮬레이션
        print("\n" + "=" * 60)
        print("프론트엔드 매핑 시뮬레이션:")
        print("=" * 60)
        
        claimable_day_fe = info.claimable_day
        claimable_rewards_fe = info.claimable_rewards if info.claimable_rewards else []
        
        print(f"Frontend claimable_day: {claimable_day_fe}")
        print(f"Frontend claimable_rewards: {claimable_rewards_fe}")
        
        if claimable_day_fe:
            print(f"\n✅ 클레임 버튼 활성화 조건 충족!")
            print(f"   - 버튼 텍스트: '🎁 오늘의 보상받기'")
            print(f"   - Day {claimable_day_fe} 보상 클레임 가능")
        else:
            print(f"\n⚠️  클레임 버튼 비활성화")
            print(f"   - 버튼 텍스트: '오빠 내일봐용!'")
        
        print("\n" + "=" * 60)
        print("테스트 완료!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_streak_info()
