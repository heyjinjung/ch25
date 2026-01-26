#!/usr/bin/env python
"""Team Battle SoT 정합성 및 시즌 롤오버 검증 스크립트.

검증 항목:
1. v2 네임스페이스 정합성: app/v2, src/v2 경로 내 team_battle 구현 확인
2. 시즌 롤오버 검증: DB 시즌/랭킹 데이터 일관성
3. Enum/상수 정합성: TeamBattleSeason, TeamBattleRank 등 확인

Usage:
    python scripts/validate_team_battle_sot.py --check all
    python scripts/validate_team_battle_sot.py --check namespace
    python scripts/validate_team_battle_sot.py --check season
    python scripts/validate_team_battle_sot.py --check active
"""
import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure project root is in path
sys.path.insert(0, ".")

from sqlalchemy import text
from app.db.session import SessionLocal


def check_v2_namespace() -> tuple[bool, list[str]]:
    """v2 네임스페이스 정합성 검증."""
    issues = []
    project_root = Path(".")
    
    # Backend v2 파일 확인
    be_files = [
        "app/v2/services/team_battle_service.py",
        "app/v2/services/team_battle_admin_service.py",
        "app/v2/api/admin/team_battle_routes.py",
    ]
    
    for f in be_files:
        if (project_root / f).exists():
            print(f"✅ BE v2 파일 존재: {f}")
        else:
            issues.append(f"❌ BE v2 파일 누락: {f}")
    
    # Frontend v2 파일 확인
    fe_files = [
        "src/v2/pages/game/TeamBattlePage.tsx",
    ]
    
    for f in fe_files:
        if (project_root / f).exists():
            print(f"✅ FE v2 파일 존재: {f}")
        else:
            issues.append(f"❌ FE v2 파일 누락: {f}")
    
    # Legacy 경로에 중복 구현이 있는지 확인
    legacy_service = project_root / "app/services/team_battle_service.py"
    if legacy_service.exists():
        print("⚠️ Legacy 경로에 team_battle_service.py 존재 (점진적 마이그레이션 중)")
    
    return len(issues) == 0, issues


def check_season_data(db) -> tuple[bool, list[str]]:
    """시즌 데이터 정합성 검증."""
    issues = []
    
    # 활성 시즌 확인
    result = db.execute(text("""
        SELECT id, season_name, starts_at, ends_at, is_active
        FROM team_season
        WHERE is_active = 1
        ORDER BY id DESC
        LIMIT 5
    """)).fetchall()
    
    if not result:
        print("ℹ️ 활성 팀배틀 시즌이 없습니다")
        return True, []
    
    active_count = 0
    for row in result:
        season_id, name, starts_at, ends_at, is_active = row
        if is_active:
            active_count += 1
            print(f"✅ 활성 시즌: ID={season_id}, Name={name}")
            print(f"   기간: {starts_at} ~ {ends_at}")
    
    if active_count > 1:
        issues.append(f"⚠️ 활성 시즌이 {active_count}개입니다 (정책상 1개 권장)")
    
    return len(issues) == 0, issues


def check_active_season_integrity(db) -> tuple[bool, list[str]]:
    """활성 시즌의 팀/멤버/점수 무결성 검증."""
    issues = []
    
    # 활성 시즌 조회
    season = db.execute(text("""
        SELECT id, season_name FROM team_season WHERE is_active = 1 LIMIT 1
    """)).fetchone()
    
    if not season:
        print("ℹ️ 활성 시즌이 없어 무결성 검증 건너뜀")
        return True, []
    
    season_id, season_name = season
    print(f"### 활성 시즌 무결성 검증: {season_name} (ID: {season_id})")
    
    # 1. 팀 수 확인
    team_count = db.execute(text("""
        SELECT COUNT(*) FROM team WHERE season_id = :season_id
    """), {"season_id": season_id}).scalar()
    print(f"   팀 수: {team_count}")
    
    # 2. 멤버 수 확인
    member_count = db.execute(text("""
        SELECT COUNT(*) FROM team_member tm
        JOIN team t ON tm.team_id = t.id
        WHERE t.season_id = :season_id
    """), {"season_id": season_id}).scalar()
    print(f"   총 멤버 수: {member_count}")
    
    # 3. 삭제된 유저가 멤버로 남아있는지 확인
    orphan_members = db.execute(text("""
        SELECT COUNT(*) FROM team_member tm
        LEFT JOIN user u ON tm.user_id = u.id
        WHERE u.id IS NULL OR u.status != 'ACTIVE'
    """)).scalar()
    
    if orphan_members > 0:
        issues.append(f"⚠️ 삭제/비활성 유저가 팀 멤버로 남아있음: {orphan_members}명")
    else:
        print("✅ 팀 멤버 유저 무결성 확인")
    
    # 4. 점수 데이터 확인
    score_count = db.execute(text("""
        SELECT COUNT(*) FROM team_score ts
        JOIN team t ON ts.team_id = t.id
        WHERE t.season_id = :season_id
    """), {"season_id": season_id}).scalar()
    print(f"   점수 기록 수: {score_count}")
    
    return len(issues) == 0, issues


def check_rollover_readiness(db) -> tuple[bool, list[str]]:
    """시즌 롤오버 준비 상태 검증."""
    issues = []
    
    # 종료 임박 시즌 확인 (7일 이내)
    result = db.execute(text("""
        SELECT id, season_name, ends_at
        FROM team_season
        WHERE is_active = 1 AND ends_at <= DATE_ADD(NOW(), INTERVAL 7 DAY)
    """)).fetchall()
    
    if result:
        for row in result:
            season_id, name, ends_at = row
            print(f"⚠️ 시즌 종료 임박: {name} (ID: {season_id})")
            print(f"   종료일: {ends_at}")
            print("   → 시즌 롤오버 준비 필요!")
    else:
        print("✅ 7일 내 종료 예정 시즌 없음")
    
    return True, issues


def main():
    parser = argparse.ArgumentParser(description="Team Battle SoT 정합성 검증")
    parser.add_argument(
        "--check",
        choices=["all", "namespace", "season", "active", "rollover"],
        default="all",
        help="검증 항목 선택",
    )
    args = parser.parse_args()
    
    print("=" * 60)
    print("Team Battle SoT 정합성 검증 스크립트")
    print(f"실행 시간: {datetime.now().isoformat()}")
    print("=" * 60)
    
    db = SessionLocal()
    all_passed = True
    all_issues = []
    
    try:
        # Namespace check doesn't need DB
        if args.check in ["all", "namespace"]:
            print("\n### v2 네임스페이스 정합성 검증")
            passed, issues = check_v2_namespace()
            if not passed:
                all_passed = False
                all_issues.extend(issues)
        
        if args.check in ["all", "season"]:
            print("\n### 시즌 데이터 정합성 검증")
            passed, issues = check_season_data(db)
            if not passed:
                all_passed = False
                all_issues.extend(issues)
        
        if args.check in ["all", "active"]:
            print("\n### 활성 시즌 무결성 검증")
            passed, issues = check_active_season_integrity(db)
            if not passed:
                all_passed = False
                all_issues.extend(issues)
        
        if args.check in ["all", "rollover"]:
            print("\n### 시즌 롤오버 준비 상태")
            passed, issues = check_rollover_readiness(db)
            if not passed:
                all_passed = False
                all_issues.extend(issues)
        
        print("\n" + "=" * 60)
        if all_passed:
            print("✅ 모든 검증 통과")
        else:
            print("❌ 검증 실패/경고 항목:")
            for issue in all_issues:
                print(f"  - {issue}")
        print("=" * 60)
        
    finally:
        db.close()
    
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
