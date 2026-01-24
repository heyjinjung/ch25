# [V2 Core] SoT 변경에 따른 테스트 명세 및 핵심 로직 수정 결과 리포트

**문서 ID**: V2-ECON-SOT-COMP-20260122  
**작성일**: 2026-01-22  
**상태**: [COMPLETED]  

## 1. 개요
2026-01-21 업데이트된 SoT(보상/경제체계)를 바탕으로 다이아몬드 자산 이관 및 레벨 XP 시스템 유연화 작업을 완료하고 검증한 결과를 기록합니다.

## 2. 핵심 검증 결과 (Verified SoT Compliance)

| 검증 항목 | SoT 기준 정책 | 테스트 결과 (Actual) | 상태 |
| :--- | :--- | :--- | :--- |
| **다이아몬드 저장소** | `GameWallet` (Token)으로 분류 및 저장 | `RewardService`를 통한 지급 시 `UserGameWallet`에 즉시 적립 확인 | **Pass** |
| **다이아몬드 소모** | 상점 구매 시 지갑 잔액 차감 | `ShopService` 구매 로직에서 인벤토리가 아닌 지갑 잔액 차감 확인 | **Pass** |
| **레벨 시스템 유연화** | DB(`V2LevelRewardTable`) 설정값 동적 로드 | DB에 설정된 임의의 문턱값(예: 77 XP) 도달 시 정확히 레벨업 트리거 | **Pass** |
| **토큰 명칭 표준화** | `DICE_TICKET`, `ROULETTE_TICKET` 등 사용 | `MissionService` 보상 명칭 업데이트 및 티켓 타입 일치 확인 | **Pass** |
| **어드민 보상 정합성** | Admin Config 수정 시 즉시 게임 반영 | `DiceService`에서 Admin Config 금액 우선 로딩 검증 완료 | **Pass** |
| **V2 모델 정합성** | Admin API가 V2 전용 모델 및 테이블 조회 | Lottery Config CRUD 시 V2 전용 테이블 데이터 정상 조회 확인 | **Pass** |
| **DB 스키마 안정성** | 긴 토큰명 지원 (DataError 방지) | `VARCHAR(50)` 확장 후 `PUZZLE_C1` 등 긴 명칭 정상 저장 확인 | **Pass** |
| **교환 시스템** | 퍼즐 -> 골드키 조합 교환 성공 | `test_exchange_c1c2.py` 스크립트 기반 최종 성공 확인 | **Pass** |

## 3. 주요 변경 사항 상세

### 3.1. 다이아몬드(DIAMOND) 자산 시스템 이관
- **RewardService**: `deliver` 및 `grant_ticket` 메서드에서 `DIAMOND` 케이스를 인벤토리 서비스 호출 대신 `GameWalletService.grant_tokens` 호출로 변경.
- **ShopService**: 상품 가격이 `DIAMOND`인 경우 `InventoryService.consume_item` 대신 지갑 자산을 차감하도록 logic 업데이트.
- **MissionService**: 미션 보상으로 지급되는 다이아몬드 또한 지갑 토큰 방식으로 일원화.

### 3.2. LevelXPService 동적 로직 구현
- **DB 우선 조회**: 하드코딩된 `LEVELS` 상수가 아닌 `V2LevelRewardTable` 테이블을 먼저 조회하여 레벨 요구량을 결정하도록 리팩토링.
- **영속성 수정**: XP 추가 후 계산된 레벨이 `UserLevelProgress` 테이블에 정확히 저장되도록 영속성 로직 보정.

## 4. 검증 수행 내역
- **표준 테스트 경로**: 
  - `tests/v2_tests/phase2_core/v2_test_economy_sot_compliance.py`: 코어 자산/레벨 로직 검증.
  - `tests/v2_tests/phase3_game/test_dice_admin_integration.py`: 게임-어드민 연동 및 배율 검증.
  - `tests/v2_tests/phase4_admin/test_admin_game_config_routes_coverage_extended.py`: V2 전용 모델 CRUD 검증.
  - `scripts/test_exchange_c1c2.py`: 지갑-인벤토리-교환 복합 시나리오 검증.

---
> [!IMPORTANT]
> 모든 코어 경제 시스템 로직이 최신 SoT 명세와 100% 일치함을 확인했습니다. 특히 어드민에서의 수치 조정이 실시간으로 로직에 반영될 수 있는 기반을 마련했습니다.
