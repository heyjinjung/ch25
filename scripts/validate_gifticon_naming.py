#!/usr/bin/env python
"""기프티콘 네이밍 포맷 검증 스크립트 (05.inventory.md 참조).

SoT 포맷: {BRAND}_GIFTICON_{AMOUNT}
- BRAND: 대문자 영문+숫자
- GIFTICON: 고정 문자열
- AMOUNT: 숫자 (원화)

Usage:
    python scripts/validate_gifticon_naming.py [--fix-preview]
    
Options:
    --fix-preview: 수정 필요 항목 미리보기 (실제 수정 안 함)
"""
from __future__ import annotations

import argparse
import re
import sys
from typing import NamedTuple

# =============================================================================
# Configuration
# =============================================================================

# 허용된 브랜드 목록 (SoT에 등록된 브랜드만)
ALLOWED_BRANDS = {
    "STARBUCKS",
    "CHICKEN",
    "PIZZA",
    "GOOGLE",
    "CULTURE",  # 문화상품권
    "CU",
    "GS25",
    "BASKINROBBINS",
    "PARIS_BAGUETTE",
    "BURGER",
    "DOMINO",
}

# 기프티콘 네이밍 정규식 (대문자, 공백 없음)
GIFTICON_PATTERN = re.compile(r"^([A-Z0-9_]+)_GIFTICON_(\d+)$")

# 소문자 포함 패턴 (오류 감지용)
LOWERCASE_PATTERN = re.compile(r"[a-z]")


class ValidationResult(NamedTuple):
    item_type: str
    is_valid: bool
    error: str | None
    suggestion: str | None


# =============================================================================
# Validation Logic
# =============================================================================

def validate_gifticon_name(item_type: str) -> ValidationResult:
    """기프티콘 네이밍 유효성 검사.
    
    Args:
        item_type: DB에 저장된 item_type 값
        
    Returns:
        ValidationResult with validation status and suggestions
    """
    # 기프티콘이 아닌 경우 스킵
    if "_GIFTICON_" not in item_type.upper():
        return ValidationResult(item_type, True, None, None)
    
    # 소문자 포함 여부 체크
    if LOWERCASE_PATTERN.search(item_type):
        suggested = item_type.upper()
        return ValidationResult(
            item_type,
            False,
            "소문자 포함됨",
            suggested,
        )
    
    # 정규식 매칭
    match = GIFTICON_PATTERN.match(item_type)
    if not match:
        return ValidationResult(
            item_type,
            False,
            "포맷 불일치 (expected: {BRAND}_GIFTICON_{AMOUNT})",
            None,
        )
    
    brand = match.group(1)
    amount = match.group(2)
    
    # 브랜드 검증 (선택적 - 알려진 브랜드만 허용할 경우)
    # if brand not in ALLOWED_BRANDS:
    #     return ValidationResult(
    #         item_type,
    #         False,
    #         f"미등록 브랜드: {brand}",
    #         None,
    #     )
    
    # 금액 검증 (100원 단위)
    if int(amount) % 100 != 0:
        return ValidationResult(
            item_type,
            False,
            f"금액이 100원 단위가 아님: {amount}",
            f"{brand}_GIFTICON_{int(amount) // 100 * 100}",
        )
    
    return ValidationResult(item_type, True, None, None)


def validate_from_db(db_session) -> list[ValidationResult]:
    """DB에서 기프티콘 데이터 조회 후 검증."""
    from sqlalchemy import text
    
    query = text("""
        SELECT DISTINCT item_type 
        FROM user_inventory_item 
        WHERE item_type LIKE '%GIFTICON%' 
           OR item_type LIKE '%gifticon%'
        ORDER BY item_type
    """)
    
    rows = db_session.execute(query).fetchall()
    results = []
    
    for row in rows:
        item_type = row[0]
        result = validate_gifticon_name(item_type)
        results.append(result)
    
    return results


def validate_from_list(item_types: list[str]) -> list[ValidationResult]:
    """주어진 리스트에서 검증."""
    return [validate_gifticon_name(item) for item in item_types]


# =============================================================================
# Main
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="기프티콘 네이밍 포맷 검증")
    parser.add_argument("--fix-preview", action="store_true", help="수정 필요 항목 미리보기")
    parser.add_argument("--dry-run", action="store_true", help="DB 연결 없이 샘플 데이터로 테스트")
    args = parser.parse_args()
    
    if args.dry_run:
        # 샘플 데이터로 테스트
        sample_items = [
            "STARBUCKS_GIFTICON_5000",      # ✅ 정상
            "starbucks_gifticon_5000",      # ❌ 소문자
            "CHICKEN_GIFTICON_10000",       # ✅ 정상
            "CHICKEN_GIFT_5000",            # ❌ 포맷 불일치
            "PIZZA_GIFTICON_5500",          # ❌ 100원 단위 아님
            "CULTURE_VOUCHER_10000",        # ✅ 기프티콘 아님 (스킵)
        ]
        results = validate_from_list(sample_items)
    else:
        # DB 연결
        try:
            from app.db.session import SessionLocal
            db = SessionLocal()
            results = validate_from_db(db)
            db.close()
        except Exception as e:
            print(f"[ERROR] DB 연결 실패: {e}")
            print("       --dry-run 옵션으로 샘플 테스트를 실행하세요.")
            sys.exit(1)
    
    # 결과 출력
    valid_count = 0
    invalid_count = 0
    
    print("\n" + "=" * 60)
    print("기프티콘 네이밍 검증 결과")
    print("=" * 60)
    
    for result in results:
        if result.is_valid:
            valid_count += 1
            if not args.fix_preview:
                print(f"✅ {result.item_type}")
        else:
            invalid_count += 1
            print(f"❌ {result.item_type}")
            print(f"   └─ 오류: {result.error}")
            if result.suggestion:
                print(f"   └─ 제안: {result.suggestion}")
    
    print("\n" + "-" * 60)
    print(f"총 검사: {len(results)} | 정상: {valid_count} | 오류: {invalid_count}")
    
    if invalid_count > 0:
        print("\n[ACTION REQUIRED] 위 오류 항목들을 수정해야 합니다.")
        if not args.fix_preview:
            print("                  --fix-preview 옵션으로 수정 제안을 확인하세요.")
        sys.exit(1)
    else:
        print("\n✅ 모든 기프티콘 네이밍이 SoT 규격을 준수합니다.")
        sys.exit(0)


if __name__ == "__main__":
    main()
