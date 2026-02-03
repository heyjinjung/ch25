"""v2_level_reward_table의 reward_type 값 확인 스크립트."""
import sys
sys.path.insert(0, "/app")

from sqlalchemy import text
from app.db.session import SessionLocal

def check_reward_types():
    db = SessionLocal()
    try:
        # v2_level_reward_table 조회
        result = db.execute(text("""
            SELECT level, required_xp, reward_type, reward_amount, reward_payload 
            FROM v2_level_reward_table 
            ORDER BY level
        """)).fetchall()
        
        print("=== v2_level_reward_table 현재 상태 ===")
        print(f"{'Level':<6} {'Required XP':<12} {'Reward Type':<20} {'Amount':<8} {'Payload'}")
        print("-" * 80)
        
        v1_types = {"DICE_TOKEN", "ROULETTE_COIN", "TRIAL_TOKEN", "GOLD_KEY", "DIAMOND_KEY"}
        v2_types = {"DICE_TICKET", "ROULETTE_TICKET", "LOTTERY_TICKET", "GOLD_KEY_TICKET", "DIAMOND_TICKET"}
        
        issues = []
        
        for row in result:
            level, req_xp, reward_type, amount, payload = row
            print(f"{level:<6} {req_xp:<12} {reward_type:<20} {amount or 0:<8} {payload}")
            
            if reward_type and reward_type.upper() in v1_types:
                issues.append(f"Level {level}: V1 타입 '{reward_type}' 사용 중")
        
        print("\n=== 문제점 분석 ===")
        if issues:
            print("⚠️ V1 타입 사용 발견:")
            for issue in issues:
                print(f"  - {issue}")
            print("\n권장: V2 타입으로 변경 필요 (DICE_TOKEN → DICE_TICKET 등)")
        else:
            print("✅ 모든 reward_type이 정상입니다.")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_reward_types()
