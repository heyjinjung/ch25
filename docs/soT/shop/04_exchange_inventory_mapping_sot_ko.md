문서 타입: SoT
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/운영
상태: SoT

# V2 Shop/Exchange 통합 SoT 04 - 교환/인벤토리 매핑

## 1. 목적
- 교환소/인벤토리/지갑 간 매핑을 정리한다.
- RewardType/ItemType 표준을 명확히 한다.

## 2. 자산 분류
- Cash: Vault
- Token: GameWallet
- Item: Inventory

### 2.1 저장소 매핑
- Vault: user.vault_locked_balance
- GameWallet: user_game_wallet
- Inventory: user_inventory_item

## 3. 교환소 정책
- Fragment -> Ticket 변환
- 비가역성
- 로그 기록

### 3.1 비가역성
- 상위 재화에서 하위 재화로 분해 금지
- 교환 취소/환불 불가

### 3.2 교환 수수료
- 기본 수수료 없음
- 이벤트성 수수료는 별도 SoT에 기록

## 4. 교환 로그
- v2_exchange_log
- input_type/input_amount
- output_type/output_amount

### 4.1 로그 용도
- 감사 추적
- 운영 분석
- 환불 불가 근거

## 5. GameWallet 표준 토큰
- ROULETTE_TICKET
- DICE_TICKET
- LOTTERY_TICKET
- GOLD_KEY_TICKET
- DIAMOND_TICKET
- GOLD_KEY_FRAGMENT
- DIAMOND_FRAGMENT
- PUZZLE_C1
- PUZZLE_C2
- PUZZLE_J
- PUZZLE_M
- DIAMOND

### 5.1 레거시 명칭 정규화
- ROULETTE_COIN -> ROULETTE_TICKET
- DICE_TOKEN -> DICE_TICKET
- GOLD_KEY -> GOLD_KEY_TICKET
- DIAMOND_KEY -> DIAMOND_TICKET

## 6. Inventory 표준 아이템
- CHICKEN_GIFTICON_5000
- CHICKEN_GIFTICON_10000
- STARBUCKS_GIFTICON_2000
- STARBUCKS_GIFTICON_10000
- PIZZA_GIFTICON_5000
- PIZZA_GIFTICON_10000
- GOOGLE_GIFTICON_5000
- GOOGLE_GIFTICON_10000

### 6.1 기프티콘 명명 규칙
- {BRAND}_GIFTICON_{AMOUNT}
- 브랜드는 SoT 화이트리스트 준수
- 금액은 KRW 정수

## 7. RewardType 매핑
- POINT/CC_POINT -> Vault
- DIAMOND -> GameWallet
- TICKET 계열 -> GameWallet
- GIFTICON -> Inventory
- NONE -> no-op

### 7.1 매핑 표
| RewardType | 저장소 | 비고 |
| --- | --- | --- |
| POINT | user.vault_locked_balance | 금고 적립 |
| CC_POINT | user.vault_locked_balance | 금고 적립 |
| DIAMOND | user_game_wallet | 지갑 적립 |
| ROULETTE_TICKET | user_game_wallet | 지갑 적립 |
| DICE_TICKET | user_game_wallet | 지갑 적립 |
| LOTTERY_TICKET | user_game_wallet | 지갑 적립 |
| GOLD_KEY_TICKET | user_game_wallet | 지갑 적립 |
| DIAMOND_TICKET | user_game_wallet | 지갑 적립 |
| GOLD_KEY_FRAGMENT | user_game_wallet | 지갑 적립 |
| DIAMOND_FRAGMENT | user_game_wallet | 지갑 적립 |
| PUZZLE_C1 | user_game_wallet | 지갑 적립 |
| PUZZLE_C2 | user_game_wallet | 지갑 적립 |
| PUZZLE_J | user_game_wallet | 지갑 적립 |
| PUZZLE_M | user_game_wallet | 지갑 적립 |
| CHICKEN_GIFTICON_5000 | user_inventory_item | 인벤토리 |
| STARBUCKS_GIFTICON_2000 | user_inventory_item | 인벤토리 |
| PIZZA_GIFTICON_5000 | user_inventory_item | 인벤토리 |
| GOOGLE_GIFTICON_5000 | user_inventory_item | 인벤토리 |
| NONE | N/A | no-op |

## 8. 교환 예시
- GOLD_KEY_FRAGMENT 10 -> GOLD_KEY_TICKET 1
- DIAMOND_FRAGMENT 30 -> DIAMOND_TICKET 1

### 8.1 예시 조건
- 수량 부족 시 실패
- 결과 지급은 즉시 반영

## 9. 인벤토리 사용 플로우(요약)
1) 아이템 타입 검증
2) 수량 차감
3) 효과 적용
4) 응답 반환

## 10. 정합성 체크
- 교환 로그 적재 확인
- 보상 지급 경로 확인
- 레거시 명칭 정규화 확인
- 기프티콘 명명 규칙 확인

## 11. 관련 문서
- v2_item_inventory_sot_ko.md
- v2_shop_exchange_policy_sot_ko.md
- v2_db_exchange_log_ko.md
- v2_inventory_shop_api_contract_ko.md

## 12. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): Shop/Exchange 통합 SoT 04 작성
