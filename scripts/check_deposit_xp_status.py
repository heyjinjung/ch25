"""운영 서버에서 입금/XP 상태 확인 스크립트"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, func, desc
from app.db.session import SessionLocal
from app.models.external_ranking import ExternalRankingData
from app.models.level_xp import UserXpEventLog, UserLevelProgress
from app.models.mission import Mission, UserMissionProgress, MissionCategory
from app.v2.models.user import V2User


def main():
    db = SessionLocal()
    try:
        print("=" * 80)
        print("입금/XP/미션 상태 확인")
        print("=" * 80)

        # 1. 최근 입금 업데이트 확인
        print("\n[1] 최근 입금 업데이트 (Top 5)")
        recent_deposits = db.execute(
            select(ExternalRankingData, V2User.nickname, V2User.cc_id)
            .join(V2User, ExternalRankingData.user_id == V2User.id)
            .order_by(desc(ExternalRankingData.updated_at))
            .limit(5)
        ).all()

        for deposit, nickname, cc_id in recent_deposits:
            print(f"  User: {nickname} ({cc_id})")
            print(f"    입금액: {deposit.deposit_amount:,}원")
            print(f"    업데이트: {deposit.updated_at}")
            print(f"    remainder: {deposit.deposit_remainder or 0}")
            print()

        # 2. 최근 CC_DEPOSIT XP 로그 확인
        print("\n[2] 최근 CC_DEPOSIT XP 로그 (Top 5)")
        recent_xp = db.execute(
            select(UserXpEventLog, V2User.nickname)
            .join(V2User, UserXpEventLog.user_id == V2User.id)
            .where(UserXpEventLog.source == "CC_DEPOSIT")
            .order_by(desc(UserXpEventLog.created_at))
            .limit(5)
        ).all()

        if not recent_xp:
            print("  ❌ CC_DEPOSIT XP 로그가 없습니다!")
        else:
            for xp, nickname in recent_xp:
                print(f"  User: {nickname} (ID: {xp.user_id})")
                print(f"    XP: +{xp.delta}")
                print(f"    생성: {xp.created_at}")
                print(f"    Meta: {xp.meta}")
                print()

        # 3. CC_DEPOSIT 미션 확인
        print("\n[3] CC_DEPOSIT 미션 확인")
        deposit_missions = db.execute(
            select(Mission)
            .where(Mission.action_type.in_(["CC_DEPOSIT", "DEPOSIT", "CC_INPUT"]))
            .where(Mission.is_active == True)
        ).scalars().all()

        if not deposit_missions:
            print("  ❌ 활성화된 CC_DEPOSIT 미션이 없습니다!")
        else:
            for m in deposit_missions:
                print(f"  Mission: {m.title}")
                print(f"    Category: {m.category}")
                print(f"    Action: {m.action_type}")
                print(f"    Target: {m.target_value}")

                # 진행 중인 유저 수 확인
                from app.v2.services.mission_service import V2MissionService
                from zoneinfo import ZoneInfo
                from datetime import datetime

                service = V2MissionService(db)
                reset_date = service._get_reset_date_str(m.category)

                progress_count = db.execute(
                    select(func.count(UserMissionProgress.user_id))
                    .where(UserMissionProgress.mission_id == m.id)
                    .where(UserMissionProgress.reset_date == reset_date)
                    .where(UserMissionProgress.current_value > 0)
                ).scalar() or 0

                print(f"    진행 중인 유저: {progress_count}명")
                print()

        # 4. 최근 입금한 유저의 미션 진행 상황
        print("\n[4] 최근 입금 유저의 미션 진행 상황")
        if recent_deposits and deposit_missions:
            for deposit, nickname, cc_id in recent_deposits[:3]:
                print(f"  User: {nickname} ({cc_id})")

                for mission in deposit_missions:
                    from app.v2.services.mission_service import V2MissionService
                    service = V2MissionService(db)
                    reset_date = service._get_reset_date_str(mission.category)

                    progress = db.execute(
                        select(UserMissionProgress)
                        .where(UserMissionProgress.user_id == deposit.user_id)
                        .where(UserMissionProgress.mission_id == mission.id)
                        .where(UserMissionProgress.reset_date == reset_date)
                    ).scalar_one_or_none()

                    if progress:
                        print(f"    {mission.title}: {progress.current_value}/{mission.target_value}")
                    else:
                        print(f"    {mission.title}: 0/{mission.target_value} (진행 없음)")
                print()

        # 5. 전체 통계
        print("\n[5] 전체 통계")
        total_deposits = db.execute(select(func.count(ExternalRankingData.user_id))).scalar() or 0
        total_xp_logs = db.execute(
            select(func.count(UserXpEventLog.id))
            .where(UserXpEventLog.source == "CC_DEPOSIT")
        ).scalar() or 0

        print(f"  총 입금 유저 수: {total_deposits}")
        print(f"  총 CC_DEPOSIT XP 로그 수: {total_xp_logs}")

        if total_deposits > 0 and total_xp_logs == 0:
            print("  ⚠️ 경고: 입금 유저는 있지만 XP 로그가 없습니다!")

    finally:
        db.close()


if __name__ == "__main__":
    main()
