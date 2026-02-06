문서 타입: SoT
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/기획/운영
상태: SoT

## 1. 목적 (Purpose)
V2 Inventory ItemType(아이템/기프티콘) 표준 목록과 네이밍 규칙을 단일 기준으로 확정한다.

## 2. 범위 (Scope)
- ItemType 네이밍 규칙
- 표준 기프티콘 ItemType 목록
- 예외/운영 임시 허용 항목의 처리 기준

## 3. 상위 SoT (References)
- 기프티콘 네이밍: docs/SOT/inventory/v2_gifticon_naming_sot_ko.md
- 인벤토리 분류: docs/SOT/inventory/변경로그/v2_item_inventory_sot_ko.md
- 지급 구현: app/v2/services/reward_service.py

## 4. SoT: ItemType 네이밍 규칙
- 포맷: {BRAND}_GIFTICON_{AMOUNT}
- BRAND: 영문 대문자, 공백 없음
- AMOUNT: 원화 정수

## 5. SoT: 표준 기프티콘 목록
아래 목록만이 정식 ItemType 표준이다.

| 브랜드 | 금액(원) | item_type |
| :--- | :--- | :--- |
| CHICKEN | 5000 | CHICKEN_GIFTICON_5000 |
| CHICKEN | 10000 | CHICKEN_GIFTICON_10000 |
| STARBUCKS | 2000 | STARBUCKS_GIFTICON_2000 |
| STARBUCKS | 10000 | STARBUCKS_GIFTICON_10000 |
| PIZZA | 5000 | PIZZA_GIFTICON_5000 |
| PIZZA | 10000 | PIZZA_GIFTICON_10000 |
| GOOGLE | 5000 | GOOGLE_GIFTICON_5000 |
| GOOGLE | 10000 | GOOGLE_GIFTICON_10000 |

## 6. 예외/임시 허용 항목 (정책/구현 충돌)
아래 항목은 코드에 존재하지만 표준 SoT에는 포함되지 않는다.
정식 채택을 원할 경우, 먼저 본 문서에 등재한 뒤 운영/DB를 동기화한다.

### 6.1 임시 허용(운영 필요)
- BAEMIN_GIFTICON_5000 / 10000 / 20000
- COMPOSE_AMERICANO_GIFTICON_3000
- CC_COIN_GIFTICON

### 6.2 정책/구현 충돌(정합성 검토 필요)
- STARBUCKS_GIFTICON_5000
- CULTURE_VOUCHER_5000 / 10000

## 7. 운영 규칙
- 신규 브랜드 추가는 본 문서의 표준 목록에 먼저 등재한다.
- ItemType이 표준 목록 밖에서 사용될 경우, 운영 로그에 경고를 남기고 정합성 점검 대상에 등록한다.

## 8. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): 정본 생성(ItemType/기프티콘 표준 및 예외 처리)
