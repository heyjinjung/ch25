#!/usr/bin/env python3
"""
VIP 유저 주사위 티켓 일괄 지급 스크립트 (2026-01-10)
타겟: 활성 VIP 11명
보상: DICE_TOKEN 5장
"""
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import or_, func
from app.db.session import SessionLocal
from app.models.user import User
from app.models.game_wallet import GameTokenType
from app.services.game_wallet_service import GameWalletService


# 지급 대상 유저 리스트 (닉네임 / external_id)
TARGET_USERS = [
    {"nickname": "김현규", "external_id": "기프트"},
    {"nickname": "송윤서", "external_id": "아사카"},
    {"nickname": "박관종", "external_id": "정우성"},
    {"nickname": "이용운", "external_id": "성민이"},
    {"nickname": "현민수", "external_id": "민똘이"},
    {"nickname": "임준범", "external_id": None},
    {"nickname": "박서준", "external_id": None},
    {"nickname": "커피사랑", "external_id": None},
    {"nickname": "최기창", "external_id": None},
    {"nickname": "오동수", "external_id": "동추"},
    {"nickname": "최재훈", "external_id": "persipic"},
]

GRANT_AMOUNT = 5
TOKEN_TYPE = GameTokenType.DICE_TOKEN
REASON = "VIP_GRATITUDE_0110"


def find_user(db: SessionLocal, nickname: str, external_id: str | None) -> User | None:
    """닉네임 또는 external_id로 유저 검색 (대소문자 무시)"""
    
    conditions = []
    
    # 닉네임 검색 (대소문자 무시)
    if nickname:
        conditions.append(func.lower(User.nickname) == nickname.lower())
    
    # External ID 검색 (대소문자 무시)
    if external_id:
        conditions.append(func.lower(User.external_id) == external_id.lower())
    
    if not conditions:
        return None
    
    return db.query(User).filter(or_(*conditions)).first()


def main(dry_run: bool = True):
    """메인 실행 함수"""
    
    db = SessionLocal()
    wallet_service = GameWalletService()
    
    print("=" * 80)
    print(f"🎁 VIP 유저 주사위 티켓 일괄 지급 (2026-01-10)")
    print(f"📦 지급 내용: {TOKEN_TYPE.value} x {GRANT_AMOUNT}장")
    print(f"🎯 대상 인원: {len(TARGET_USERS)}명")
    print(f"⚙️  모드: {'DRY RUN (시뮬레이션)' if dry_run else '🔥 EXECUTE (실제 지급)'}")
    print("=" * 80)
    print()
    
    found_users = []
    not_found = []
    granted = []
    failed = []
    
    try:
        # 1단계: 유저 검색
        print("📋 [1단계] 유저 검색 중...\n")
        for idx, target in enumerate(TARGET_USERS, 1):
            nickname = target["nickname"]
            external_id = target["external_id"]
            
            user = find_user(db, nickname, external_id)
            
            if user:
                found_users.append({
                    "user": user,
                    "nickname": nickname,
                    "external_id": external_id
                })
                print(f"✅ [{idx:2d}] {nickname:10s} (DB: {user.nickname:10s}, ID: {user.id:3d}) - 발견")
            else:
                not_found.append({
                    "nickname": nickname,
                    "external_id": external_id
                })
                print(f"❌ [{idx:2d}] {nickname:10s} (사이트: {external_id or 'N/A':10s}) - 미발견")
        
        print(f"\n✅ 발견: {len(found_users)}명")
        print(f"❌ 미발견: {len(not_found)}명\n")
        
        if not found_users:
            print("⚠️  지급할 유저가 없습니다.")
            return
        
        # 2단계: 티켓 지급
        print("=" * 80)
        print(f"💎 [2단계] 티켓 지급 {'시뮬레이션' if dry_run else '실행'} 중...\n")
        
        for item in found_users:
            user = item["user"]
            nickname = item["nickname"]
            
            try:
                if not dry_run:
                    # 실제 지급
                    wallet_service.grant_tokens(
                        db=db,
                        user_id=user.id,
                        token_type=TOKEN_TYPE,
                        amount=GRANT_AMOUNT,
                        reason=REASON,
                        commit=True
                    )
                    db.commit()
                
                granted.append(item)
                status = "✅ 지급 완료" if not dry_run else "✅ 지급 예정"
                print(f"{status} | {user.nickname:10s} (ID: {user.id:3d}) → {TOKEN_TYPE.value} +{GRANT_AMOUNT}")
                
            except Exception as e:
                failed.append({**item, "error": str(e)})
                print(f"❌ 실패    | {user.nickname:10s} (ID: {user.id:3d}) → 오류: {e}")
        
        # 결과 요약
        print("\n" + "=" * 80)
        print("📊 [최종 결과]\n")
        print(f"✅ 성공: {len(granted)}명")
        print(f"❌ 실패: {len(failed)}명")
        print(f"⚠️  미발견: {len(not_found)}명")
        print("=" * 80)
        
        if not_found:
            print("\n⚠️  미발견 유저 리스트:")
            for item in not_found:
                print(f"   - {item['nickname']} (사이트: {item['external_id'] or 'N/A'})")
        
        if failed:
            print("\n❌ 실패 유저 리스트:")
            for item in failed:
                print(f"   - {item['nickname']} (오류: {item['error']})")
        
        if dry_run:
            print("\n" + "=" * 80)
            print("ℹ️  DRY RUN 모드입니다. 실제로 지급되지 않았습니다.")
            print("ℹ️  실제 지급을 원하시면 --execute 옵션을 사용하세요:")
            print(f"   python {Path(__file__).name} --execute")
            print("=" * 80)
        
    except Exception as e:
        print(f"\n💥 예기치 않은 오류 발생: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    # 커맨드 라인 인자 파싱
    import argparse
    
    parser = argparse.ArgumentParser(description="VIP 유저 주사위 티켓 일괄 지급")
    parser.add_argument(
        "--execute",
        action="store_true",
        help="실제 지급 실행 (기본값: dry-run)"
    )
    
    args = parser.parse_args()
    
    main(dry_run=not args.execute)
