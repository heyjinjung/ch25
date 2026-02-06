문서 타입: SoT
버전: v1.0
작성일: 2026-01-18
작성자: GitHub Copilot
대상: BE/FE/기획
상태: SoT

## 1. 목적 (Purpose)
V2 브랜드 기프티콘 네이밍 규칙을 확정한다.

## 2. 범위 (Scope)
- 브랜드 목록
- 네이밍 포맷
- 금액 단위

## 3. 용어 정의 (Definitions)
- 기프티콘 네이밍: 인벤토리 item_type 표준 키

## 4. 네이밍 포맷 (SoT)
- 포맷: `{BRAND}_GIFTICON_{AMOUNT}`
- AMOUNT는 정수(원) 표기
- 예: `STARBUCKS_GIFTICON_5000`

### 4.1 브랜드 추가/확장 규칙 (Extension Rules)
새로운 브랜드의 기프티콘을 추가할 때는 다음 절차를 준수해야 합니다.

1.  **브랜드명 선정**: 영문 대문자, 공백 없이 표기 (예: `BURGERKING`)
2.  **포맷 적용**: `{BRAND}_GIFTICON_{AMOUNT}` 형식을 엄수.
3.  **금액 단위**: KRW 기준, 100원 단위 절사 (예: 4900 -> 4900, 4990 -> 5000 권장)
4.  **문서 등록**: 본 문서의 **5. 브랜드 목록** 테이블에 `item_type`을 선언한 뒤 DB에 INSERT.
    - *문서 미등록 상태의 기프티콘 추가는 배포 거절 사유가 됨.*

## 5. 브랜드 목록 (SoT)
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

## 6. 운영/검증 (QA)
- [ ] 포맷 일치 여부 확인
- [ ] 금액 정수 표기 확인

## 7. 변경 이력
- v1.0 (2026-01-18, GitHub Copilot): 최초 작성

 SoT 기준 완전 재정립 계획을 수립했습니다. 10개 카테고리 전체를 프론트엔드 상수/백엔드 enum/DB 스키마에 일관되게 적용하는 Full-Stack 표준화 작업입니다.

주요 변경사항:

게임 티켓 3종 (ROULETTE/DICE/LOTTERY_TICKET)
금고 (VAULT)
프리미엄 티켓 & 조각 4종 (GOLD_KEY_TICKET, DIAMOND_TICKET 등)
복권 퍼즐 4종 (PUZZLE_C1, C2, J, M)
재화 (DIAMOND)
기프티콘 8종 (SoT 정의된 것만)
특수 (NONE)