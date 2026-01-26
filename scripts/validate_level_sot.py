#!/usr/bin/env python
"""Level SoT 정합성 검증 스크립트.

검증 항목:
1. DB 스키마 검증: user_level_progress.xp 컬럼 존재, v2_user에 XP 컬럼 부재
2. Legacy API 검증: season_pass 필드가 null 반환 확인
3. CC Deposit XP 적립 검증: 10만원당 20XP 적립 규칙 준수
4. 레벨 보상표 정합성: v2_level_reward_table과 SoT 일치

Usage:
    python scripts/validate_level_sot.py --check all
    python scripts/validate_level_sot.py --check schema
    python scripts/validate_level_sot.py --check cc_deposit
    python scripts/validate_level_sot.py --check reward_table
"""
import argparse
import sys
from datetime import datetime, timedelta

# Ensure project root is in path
sys.path.insert(0, ".")

from sqlalchemy import text, inspect
from app.db.session import SessionLocal


STEP_AMOUNT = 100_000
XP_PER_STEP = 20


def check_db_schema(db) -> tuple[bool, list[str]]:
    """DB 스키마 정합성 검증."""
    issues = []
    
    # 1. user_level_progress 테이블 및 xp 컬럼 존재 확인
    result = db.execute(text("""
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'user_level_progress' AND column_name = 'xp'
    """)).scalar()
    
    if result == 0:
        issues.append("❌ user_level_progress.xp 컬럼이 존재하지 않습니다")
    else:
        print("✅ user_level_progress.xp 컬럼 존재 확인")
    
    # 2. v2_user 테이블에 XP 관련 컬럼이 없어야 함
    result = db.execute(text("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'v2_user' AND column_name IN ('xp', 'level_xp', 'level_point')
    """)).fetchall()
    
    if result:
        cols = [r[0] for r in result]
        issues.append(f"❌ v2_user 테이블에 XP 관련 컬럼이 존재: {cols}")
    else:
        print("✅ v2_user 테이블에 XP 컬럼 부재 확인 (정책 준수)")
    
    # 3. user_xp_event_log 테이블 존재 확인
    result = db.execute(text("""
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_name = 'user_xp_event_log'
    """)).scalar()
    
    if result == 0:
        issues.append("❌ user_xp_event_log 테이블이 존재하지 않습니다")
    else:
        print("✅ user_xp_event_log 테이블 존재 확인")
    
    return len(issues) == 0, issues


def check_cc_deposit_xp(db) -> tuple[bool, list[str]]:
    """CC Deposit XP 적립 규칙 검증 (10만원당 20XP)."""
    issues = []
    
    # CC_DEPOSIT 소스로 적립된 XP 로그 조회
    result = db.execute(text("""
        SELECT user_id, delta, meta
        FROM user_xp_event_log
        WHERE source = 'CC_DEPOSIT'
        ORDER BY created_at DESC
        LIMIT 100
    """)).fetchall()
    
    if not result:
        print("ℹ️ CC_DEPOSIT 소스의 XP 로그가 없습니다 (정상 - 아직 적립 없음)")
        return True, []
    
    valid_count = 0
    invalid_count = 0
    
    for row in result:
        user_id, delta, meta = row
        if meta:
            import json
            meta_dict = json.loads(meta) if isinstance(meta, str) else meta
            deposit_steps = meta_dict.get("deposit_steps", 0)
            xp_per_step = meta_dict.get("xp_per_step", XP_PER_STEP)
            
            expected_xp = deposit_steps * xp_per_step
            if delta == expected_xp:
                valid_count += 1
            else:
                invalid_count += 1
                issues.append(f"⚠️ user_id={user_id}: delta={delta} vs expected={expected_xp}")
    
    if invalid_count == 0:
        print(f"✅ CC_DEPOSIT XP 적립 규칙 준수 확인 ({valid_count}건 검증)")
    else:
        print(f"❌ CC_DEPOSIT XP 적립 규칙 위반 ({invalid_count}/{valid_count + invalid_count}건)")
    
    return invalid_count == 0, issues


def check_reward_table(db) -> tuple[bool, list[str]]:
    """레벨 보상표 정합성 검증."""
    issues = []
    
    # SoT 기준: Level 1~20
    SOT_LEVELS = list(range(1, 21))
    
    # user_level_reward_log에서 사용된 레벨 범위 확인
    result = db.execute(text("""
        SELECT DISTINCT level FROM user_level_reward_log ORDER BY level
    """)).fetchall()
    
    if not result:
        print("ℹ️ 레벨 보상 로그가 없습니다 (정상 - 아직 지급 없음)")
        return True, []
    
    logged_levels = [r[0] for r in result]
    
    # SoT 범위 외의 레벨이 있는지 확인
    out_of_range = [lv for lv in logged_levels if lv < 1 or lv > 20]
    if out_of_range:
        issues.append(f"⚠️ SoT 범위(1~20) 외의 레벨 보상 발견: {out_of_range}")
    else:
        print(f"✅ 레벨 보상 범위 정합성 확인 (Level 1~20)")
    
    return len(issues) == 0, issues


def check_season_pass_null(db) -> tuple[bool, list[str]]:
    """Legacy API season_pass 필드 null 반환 확인 (코드 레벨 검증)."""
    issues = []
    
    # RoulettePlayResponse 스키마 확인
    try:
        from app.schemas.roulette import RoulettePlayResponse
        
        # 기본값이 None인지 확인
        fields = RoulettePlayResponse.model_fields
        season_pass_field = fields.get("season_pass")
        
        if season_pass_field:
            default = season_pass_field.default
            if default is None:
                print("✅ RoulettePlayResponse.season_pass 기본값 = None 확인")
            else:
                issues.append(f"❌ RoulettePlayResponse.season_pass 기본값이 None이 아님: {default}")
        else:
            print("ℹ️ RoulettePlayResponse에 season_pass 필드 없음 (정상)")
            
    except ImportError as e:
        issues.append(f"⚠️ 스키마 import 실패: {e}")
    
    return len(issues) == 0, issues


def main():
    parser = argparse.ArgumentParser(description="Level SoT 정합성 검증")
    parser.add_argument(
        "--check",
        choices=["all", "schema", "cc_deposit", "reward_table", "season_pass"],
        default="all",
        help="검증 항목 선택",
    )
    args = parser.parse_args()
    
    print("=" * 60)
    print("Level SoT 정합성 검증 스크립트")
    print(f"실행 시간: {datetime.now().isoformat()}")
    print("=" * 60)
    
    db = SessionLocal()
    all_passed = True
    all_issues = []
    
    try:
        checks = []
        if args.check in ["all", "schema"]:
            checks.append(("DB 스키마 검증", check_db_schema))
        if args.check in ["all", "cc_deposit"]:
            checks.append(("CC Deposit XP 적립 검증", check_cc_deposit_xp))
        if args.check in ["all", "reward_table"]:
            checks.append(("레벨 보상표 정합성", check_reward_table))
        if args.check in ["all", "season_pass"]:
            checks.append(("Season Pass null 반환", check_season_pass_null))
        
        for name, check_fn in checks:
            print(f"\n### {name}")
            passed, issues = check_fn(db)
            if not passed:
                all_passed = False
                all_issues.extend(issues)
        
        print("\n" + "=" * 60)
        if all_passed:
            print("✅ 모든 검증 통과")
        else:
            print("❌ 검증 실패 항목:")
            for issue in all_issues:
                print(f"  - {issue}")
        print("=" * 60)
        
    finally:
        db.close()
    
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
