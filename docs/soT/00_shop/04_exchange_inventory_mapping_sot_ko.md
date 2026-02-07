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

### 2.2 분류 원칙
- Cash는 출금 가능 자산
- Token은 게임 플레이 재화
- Item은 소비/사용형 자산

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

### 4.2 스키마 필드
- id
- user_id
- input_type
- input_amount
- output_type
- output_amount
- created_at

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

### 5.2 토큰 저장 규칙
- wallet.balance는 정수
- 음수 허용 금지
- 차감/지급은 트랜잭션 처리

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

### 6.2 인벤토리 저장 규칙
- quantity는 정수
- 0 미만 금지
- UNIQUE(user_id, item_type)

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

### 7.2 보상 지급 원칙
- Wallet 지급은 즉시 반영
- Inventory 지급은 수량 증가
- Vault 지급은 금고 적립

## 8. 교환 예시
- GOLD_KEY_FRAGMENT 10 -> GOLD_KEY_TICKET 1
- DIAMOND_FRAGMENT 30 -> DIAMOND_TICKET 1

### 8.1 예시 조건
- 수량 부족 시 실패
- 결과 지급은 즉시 반영

### 8.2 교환 입력 검증
- input_amount >= 1
- output_amount >= 1
- input_type 표준 확인
- output_type 표준 확인

## 9. 인벤토리 사용 플로우(요약)
1) 아이템 타입 검증
2) 수량 차감
3) 효과 적용
4) 응답 반환

### 9.1 사용 요청 포맷
- Endpoint: POST /api/v2/inventory/use
- Headers: Idempotency-Key (선택)
- Body: item_type, amount

### 9.2 실패 케이스
- 수량 부족
- item_type 누락
- 허용되지 않은 타입

## 10. 정합성 체크
- 교환 로그 적재 확인
- 보상 지급 경로 확인
- 레거시 명칭 정규화 확인
- 기프티콘 명명 규칙 확인

### 10.1 정합성 확인 쿼리(예시)
```sql
SELECT * FROM v2_exchange_log ORDER BY id DESC LIMIT 5;
```

## 11. QA 체크리스트
- [ ] 교환 성공 시 로그 적재
- [ ] 교환 실패 시 로그 미적재
- [ ] 기프티콘 사용 시 인벤토리 차감
- [ ] 퍼즐 조각 지급 경로 확인

### 11.1 QA 시나리오
- GOLD_KEY_FRAGMENT 부족 케이스
- DIAMOND_FRAGMENT 정상 교환
- 퍼즐 조각 지급 확인
- 기프티콘 사용 후 수량 감소

## 12. 운영 주의사항
- 교환은 환불 불가 정책 고지
- 입력/출력 타입의 표준화 유지
- 이벤트성 교환은 별도 SoT 기록

### 12.1 공지 문구 권장
- "교환 완료 후 환불 불가"
- "교환은 즉시 반영"

## 13. CostType/RewardType 분리 원칙
- CostType은 결제 수단
- RewardType은 지급 대상
- 동일 타입이라도 저장소가 다를 수 있음

## 14. 데이터 정합성 규칙
- Vault는 user.vault_locked_balance 단일 기준
- Wallet/Inventory 혼용 금지
- 레거시 명칭은 응답 전에 정규화

## 15. 모니터링 포인트
- 교환 실패율
- 입력 재화 부족 비율
- 비표준 타입 요청

## 16. 장애 대응
1) 입력/출력 타입 확인
2) 수량 검증 확인
3) 로그 적재 여부 확인
4) 지급 경로 확인

## 17. API 계약 요약
- POST /api/v2/inventory/use
- GET /api/v2/inventory
- POST /api/v2/shop/purchase

## 17.1 응답 확인
- inventory items 갱신
- wallet 잔액 갱신

## 18. 관련 문서
- v2_item_inventory_sot_ko.md
- v2_shop_exchange_policy_sot_ko.md
- v2_db_exchange_log_ko.md
- v2_inventory_shop_api_contract_ko.md

## 19. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): Shop/Exchange 통합 SoT 04 작성
