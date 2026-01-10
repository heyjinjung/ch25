#!/usr/bin/env python3
"""VIP 유저 주사위 티켓 일괄 지급 스크립트 (2026-01-10)

요청사항:
- CSV/운영 리스트에 있는 닉네임(사이트 닉네임 포함)으로만 매칭
- 서버 DB에 존재하는 유저만 지급
- 동명이인(복수 매칭) 발생 시 오지급 방지를 위해 스킵

보상: DICE_TOKEN 5장
"""
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import func
from app.db.session import SessionLocal
from app.models.user import User
from app.models.game_wallet import GameTokenType
from app.services.game_wallet_service import GameWalletService


# 지급 대상 닉네임 별칭 리스트
# - "닉네임(사이트)"가 있는 경우: 그 값을 우선 사용
# - 없는 경우: 운영 리스트의 한글 닉네임을 사용
# - 최재훈은 요청에 따라 제외
DEFAULT_TARGET_NICKNAME_ALIASES = [
    ["기프트", "김현규"],
    ["아사카", "송윤서"],
    ["정우성", "박관종"],
    ["성민이", "이용운"],
    ["민똘이", "현민수"],
    ["임준범"],
    ["박서준"],
    ["커피사랑"],
    ["최기창"],
    ["동추", "오동수"],
]

GRANT_AMOUNT = 5
TOKEN_TYPE = GameTokenType.DICE_TOKEN
REASON = "VIP_GRATITUDE_0110"


def _find_unique_user_by_nickname_aliases(db: SessionLocal, aliases: list[str]) -> tuple[User | None, str | None]:
    """별칭(닉네임 후보들)로 유저를 유일하게 찾는다.

    Returns:
        (user, err)
        - user: 유저를 유일하게 찾으면 User
        - err: 미발견/중복 등으로 확정 불가하면 에러 문자열
    """

    clean_aliases = [a.strip() for a in aliases if (a or "").strip()]
    if not clean_aliases:
        return None, "NO_ALIASES"

    matches: list[User] = []
    for alias in clean_aliases:
        rows = (
            db.query(User)
            .filter(func.lower(User.nickname) == alias.lower())
            .limit(3)
            .all()
        )
        for row in rows:
            if all(row.id != existing.id for existing in matches):
                matches.append(row)

    if not matches:
        return None, "NOT_FOUND"
    if len(matches) > 1:
        ids = ",".join(str(u.id) for u in matches)
        return None, f"AMBIGUOUS_MULTIPLE_USERS(ids={ids})"
    return matches[0], None


def _parse_nickname_alias_groups(raw: str | None) -> list[list[str]]:
        """CLI에서 전달받은 별칭 그룹을 파싱.

        형식:
            - 그룹은 ';'로 구분
            - 그룹 내 별칭은 ','로 구분

        예:
            "기프트,김현규;아사카,송윤서;커피사랑"
        """

        if not raw:
                return []
        groups: list[list[str]] = []
        for group in raw.split(";"):
                aliases = [x.strip() for x in group.split(",") if x.strip()]
                if aliases:
                        groups.append(aliases)
        return groups


def main(dry_run: bool = True, nickname_alias_groups: list[list[str]] | None = None):
    """메인 실행 함수"""
    
    db = SessionLocal()
    wallet_service = GameWalletService()
    
    print("=" * 80)
    print(f"🎁 VIP 유저 주사위 티켓 일괄 지급 (2026-01-10)")
    print(f"📦 지급 내용: {TOKEN_TYPE.value} x {GRANT_AMOUNT}장")
    targets = nickname_alias_groups or DEFAULT_TARGET_NICKNAME_ALIASES
    print(f"🎯 대상 인원(별칭 그룹): {len(targets)}개")
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
        for idx, aliases in enumerate(targets, 1):
            user, err = _find_unique_user_by_nickname_aliases(db, aliases)

            label = "/".join(aliases)
            if user:
                found_users.append({"user": user, "aliases": aliases})
                print(f"✅ [{idx:2d}] {label:20s} (DB: {user.nickname:12s}, ID: {user.id:3d}) - 발견")
            else:
                not_found.append({"aliases": aliases, "error": err})
                print(f"❌ [{idx:2d}] {label:20s} - 미확정({err})")
        
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
                label = "/".join(item["aliases"])
                print(f"   - {label} (사유: {item['error']})")
        
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

    parser.add_argument(
        "--nickname-alias-groups",
        type=str,
        default=None,
        help=(
            "별칭 그룹을 직접 지정합니다. 그룹은 ';'로, 그룹 내 별칭은 ','로 구분합니다. "
            "예: '기프트,김현규;아사카,송윤서;커피사랑'"
        ),
    )
    
    args = parser.parse_args()
    
    groups = _parse_nickname_alias_groups(args.nickname_alias_groups)
    main(dry_run=not args.execute, nickname_alias_groups=groups or None)
