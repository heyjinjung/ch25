문서 타입: DB 스키마
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/DB/운영
상태: SoT

## 1. 목적 (Purpose)
교환소/제작 로그(V2)를 DB로 저장하기 위한 테이블 스키마를 정의한다.

## 2. 범위 (Scope)
- Fragment -> Ticket 제작 로그
- 티켓 변환/교환 로그

## 3. 테이블 정의 (Schema)
**Table**: `v2_exchange_log`

| 컬럼 | 타입 | 제약 | 설명 |
| :--- | :--- | :--- | :--- |
| id | INT | PK | 로그 식별자 |
| user_id | INT | NOT NULL | 유저 ID |
| input_type | VARCHAR(50) | NOT NULL | 재료 타입 |
| input_amount | INT | NOT NULL | 재료 수량 |
| output_type | VARCHAR(50) | NOT NULL | 결과 타입 |
| output_amount | INT | NOT NULL | 결과 수량 |
| created_at | DATETIME | NOT NULL | 생성 시각 |

## 4. 근거 (Source)
- 상점/교환소 정책 SoT: [docs/v2_specs/01_core/v2_shop_exchange_policy_sot_ko.md](../01_core/v2_shop_exchange_policy_sot_ko.md#L1)
- 아이템/인벤토리 SoT: [docs/v2_specs/01_core/v2_item_inventory_sot_ko.md](../01_core/v2_item_inventory_sot_ko.md#L1)

## 5. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
