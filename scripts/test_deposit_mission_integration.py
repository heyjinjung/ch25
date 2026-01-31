"""Test script to verify CC deposit mission integration.

테스트 목적:
1. 입금 증가 시 XP가 정상 반영되는지 확인
2. 입금 증가 시 CC_DEPOSIT 미션 진행이 업데이트되는지 확인
3. 주간 입금 미션이 정상 작동하는지 확인
"""
import sys
from datetime import datetime
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, func
from app.db.session import SessionLocal
from app.v2.models.user import V2User
from app.models.external_ranking import ExternalRankingData
from app.models.mission import Mission, UserMissionProgress, MissionCategory
from app.v2.services.admin_cc_deposit_service import V2AdminCCDepositService
from app.v2.schemas.v2_cc_deposit import CCDepositCreate
from app.models.level_xp import UserXpEventLog


def get_test_user_or_create(db):
    """테스트용 유저 조회 또는 생성"""
    # 기존 유저 중 하나 선택 또는 테스트 유저 생성
    user = db.execute(
        select(V2User)
        .where(V2User.cc_id.isnot(None))
        .order_by(V2User.id.desc())
        .limit(1)
    ).scalar_one_or_none()

    if not user:
        user = V2User(
            cc_id="test_deposit_user",
            telegram_username="test_deposit_user",
            nickname="테스트유저",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


def check_cc_deposit_missions(db):
    """CC_DEPOSIT 액션 타입의 미션 확인"""
    print("\n=== CC_DEPOSIT 미션 조회 ===")

    missions = db.execute(
        select(Mission)
        .where(Mission.action_type.in_(["CC_DEPOSIT", "DEPOSIT", "CC_INPUT"]))
        .where(Mission.is_active == True)
    ).scalars().all()

    if not missions:
        print("⚠️  활성화된 CC_DEPOSIT 미션이 없습니다.")
        print("주간 입금 미션이 DB에 등록되어 있는지 확인 필요")
        return None

    for m in missions:
        print(f"Mission ID: {m.id}")
        print(f"  Title: {m.title}")
        print(f"  Category: {m.category}")
        print(f"  Action: {m.action_type}")
        print(f"  Target: {m.target_value}")
        print(f"  Reward: {m.reward_type} x {m.reward_amount}")
        print()

    return missions


def test_deposit_increase(db, user_id: int):
    """입금 증가 테스트"""
    print(f"\n=== 테스트 유저 ID: {user_id} ===")

    # 현재 입금 내역 조회
    existing = db.execute(
        select(ExternalRankingData)
        .where(ExternalRankingData.user_id == user_id)
    ).scalar_one_or_none()

    prev_deposit = existing.deposit_amount if existing else 0
    prev_xp_count = db.execute(
        select(func.count(UserXpEventLog.id))
        .where(UserXpEventLog.user_id == user_id)
        .where(UserXpEventLog.source == "CC_DEPOSIT")
    ).scalar() or 0

    print(f"현재 입금액: {prev_deposit:,}원")
    print(f"현재 CC_DEPOSIT XP 로그 수: {prev_xp_count}")

    # CC_DEPOSIT 미션 진행 상황 조회
    missions = check_cc_deposit_missions(db)
    if missions:
        print("\n=== 미션 진행 상황 (Before) ===")
        for mission in missions:
            from app.v2.services.mission_service import V2MissionService
            service = V2MissionService(db)
            reset_date = service._get_reset_date_str(mission.category)

            progress = db.execute(
                select(UserMissionProgress)
                .where(UserMissionProgress.user_id == user_id)
                .where(UserMissionProgress.mission_id == mission.id)
                .where(UserMissionProgress.reset_date == reset_date)
            ).scalar_one_or_none()

            current = progress.current_value if progress else 0
            completed = progress.is_completed if progress else False
            print(f"Mission '{mission.title}': {current}/{mission.target_value} (완료: {completed})")

    # 입금 증가 시뮬레이션 (100,000원 입금 -> 1 step)
    new_deposit = prev_deposit + 100_000
    print(f"\n입금 증가: {prev_deposit:,}원 -> {new_deposit:,}원")

    # upsert_many 호출
    payload = CCDepositCreate(
        user_id=user_id,
        deposit_amount=new_deposit,
        play_count=(existing.play_count if existing else 0) + 1,
        memo="테스트 입금"
    )

    try:
        V2AdminCCDepositService.upsert_many(db, [payload], now=datetime.utcnow())
        print("✅ upsert_many 호출 성공")
    except Exception as e:
        print(f"❌ upsert_many 실패: {e}")
        import traceback
        traceback.print_exc()
        return

    # 결과 확인
    new_xp_count = db.execute(
        select(func.count(UserXpEventLog.id))
        .where(UserXpEventLog.user_id == user_id)
        .where(UserXpEventLog.source == "CC_DEPOSIT")
    ).scalar() or 0

    print(f"\n=== 결과 확인 ===")
    print(f"XP 로그 수 변화: {prev_xp_count} -> {new_xp_count}")

    if new_xp_count > prev_xp_count:
        print("✅ XP가 정상적으로 추가되었습니다.")
    else:
        print("⚠️  XP가 추가되지 않았습니다.")

    # 미션 진행 상황 확인
    if missions:
        print("\n=== 미션 진행 상황 (After) ===")
        for mission in missions:
            from app.v2.services.mission_service import V2MissionService
            service = V2MissionService(db)
            reset_date = service._get_reset_date_str(mission.category)

            progress = db.execute(
                select(UserMissionProgress)
                .where(UserMissionProgress.user_id == user_id)
                .where(UserMissionProgress.mission_id == mission.id)
                .where(UserMissionProgress.reset_date == reset_date)
            ).scalar_one_or_none()

            current = progress.current_value if progress else 0
            completed = progress.is_completed if progress else False
            print(f"Mission '{mission.title}': {current}/{mission.target_value} (완료: {completed})")

            if progress and progress.current_value > 0:
                print("✅ 미션 진행이 업데이트되었습니다.")
            else:
                print("❌ 미션 진행이 업데이트되지 않았습니다.")


def main():
    db = SessionLocal()
    try:
        user = get_test_user_or_create(db)
        print(f"테스트 유저: {user.nickname} (ID: {user.id}, CC ID: {user.cc_id})")

        # 미션 확인
        check_cc_deposit_missions(db)

        # 입금 증가 테스트
        test_deposit_increase(db, user.id)

    finally:
        db.close()


if __name__ == "__main__":
    main()
