문서 타입: SoT
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/기획/운영
상태: SoT

# V2 Shop/Exchange 통합 SoT 01 - 개요/정책

## 1. 목적
- V2 상점/교환소의 최신 정책을 단일 문서로 통합한다.
- 최신 날짜 우선 원칙으로 충돌을 정리한다.
- 운영/코드/DB/프론트의 기준선을 명확히 한다.

## 2. 범위
- 상점 구매 정책
- 교환소(제작) 정책
- 결제 재화(CostType) 확장 정책
- 운영 리스크(제재/공백)

## 3. 우선순위 규칙
- 최신 날짜 문서가 우선이다.
- learned_ 문서가 존재하면 해당 내용을 최우선한다.
- 금고 SoT는 `user.vault_locked_balance` 단일 기준이다.
- KST/09:00 운영일 정책을 준수한다.

## 4. 핵심 정의
- 상점(Shop): Vault/토큰을 소모하여 상품을 구매하는 기능.
- 교환소(Exchange): Fragment -> Ticket 등 비가역 제작 기능.
- SoT: 정책/동작 판단의 단일 기준 문서.
- CostType: 구매 시 차감하는 재화 타입.
- RewardType: 지급되는 재화/아이템 타입.

## 5. 자산 분류(SoT)
- Cash: Vault 포인트, SoT는 `user.vault_locked_balance`.
- Token: GameWallet에 저장되는 게임 토큰.
- Item: Inventory에 저장되는 소비성 아이템.

## 6. 상점 정책(요약)
- 결제는 금고 또는 게임 토큰으로 처리된다.
- 구매는 트랜잭션으로 처리된다.
- 환불은 원칙적으로 불가하다.
- 가격 변경은 소급 적용하지 않는다.

### 6.1 상품 구조(핵심 필드)
- sku: 상품 코드
- name/title: 표시 이름
- cost_type: 결제 타입
- cost_amount: 결제 금액
- reward_type: 보상 타입
- reward_amount: 보상 수량
- visible: 노출 여부

### 6.2 구매 제한(운영 옵션)
- daily_limit: 일일 구매 제한
- purchase_limit_per_user: 유저당 제한
- stock_limit: 재고 제한
- starts_at/ends_at: 판매 기간

### 6.3 결제/지급 원칙
- 결제는 선차감이다.
- 지급은 즉시 완료된다.
- 이중 청구 방지를 위해 로그를 남긴다.
- 실패 시 전체 롤백한다.

## 7. CostType 정책(최신)
- 2026-02-05 기준 확장 정책을 우선 적용한다.
- 결제 재화는 Vault 또는 게임 토큰이다.
- 기프티콘은 결제 수단에서 제외한다.

### 7.1 결제 경로
- VAULT/POINT/CC_POINT: `user.vault_locked_balance`
- 게임 토큰: `user_game_wallet`
- 다이아: `user_game_wallet`

### 7.2 CostType -> 저장소 매핑
| CostType | 저장소 | 비고 |
| --- | --- | --- |
| VAULT | user.vault_locked_balance | SoT 단일 기준 |
| POINT | user.vault_locked_balance | VAULT alias |
| CC_POINT | user.vault_locked_balance | VAULT alias |
| DIAMOND | user_game_wallet | 재화 토큰 |
| ROULETTE_TICKET | user_game_wallet | 게임 티켓 |
| DICE_TICKET | user_game_wallet | 게임 티켓 |
| LOTTERY_TICKET | user_game_wallet | 게임 티켓 |
| GOLD_KEY_TICKET | user_game_wallet | 프리미엄 티켓 |
| DIAMOND_TICKET | user_game_wallet | 프리미엄 티켓 |
| TRIAL_TICKET | user_game_wallet | 체험 티켓 |
| GOLD_KEY_FRAGMENT | user_game_wallet | 조각 |
| DIAMOND_FRAGMENT | user_game_wallet | 조각 |
| PUZZLE_C1 | user_game_wallet | 퍼즐 조각 |
| PUZZLE_C2 | user_game_wallet | 퍼즐 조각 |
| PUZZLE_J | user_game_wallet | 퍼즐 조각 |
| PUZZLE_M | user_game_wallet | 퍼즐 조각 |

### 7.1 CostType 목록
- VAULT
- POINT (VAULT alias)
- CC_POINT (VAULT alias)
- DIAMOND
- ROULETTE_TICKET
- DICE_TICKET
- LOTTERY_TICKET
- GOLD_KEY_TICKET
- DIAMOND_TICKET
- TRIAL_TICKET
- GOLD_KEY_FRAGMENT
- DIAMOND_FRAGMENT
- PUZZLE_C1
- PUZZLE_C2
- PUZZLE_J
- PUZZLE_M

## 8. 보상 정책(요약)
- 티켓/조각/퍼즐: GameWallet
- 다이아: GameWallet
- 기프티콘: Inventory
- NONE: 보상 없음

### 8.1 RewardType -> 저장소 매핑
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
| CHICKEN_GIFTICON_10000 | user_inventory_item | 인벤토리 |
| STARBUCKS_GIFTICON_2000 | user_inventory_item | 인벤토리 |
| STARBUCKS_GIFTICON_10000 | user_inventory_item | 인벤토리 |
| PIZZA_GIFTICON_5000 | user_inventory_item | 인벤토리 |
| PIZZA_GIFTICON_10000 | user_inventory_item | 인벤토리 |
| GOOGLE_GIFTICON_5000 | user_inventory_item | 인벤토리 |
| GOOGLE_GIFTICON_10000 | user_inventory_item | 인벤토리 |
| NONE | N/A | no-op |

## 9. 교환소 정책(요약)
- 하위 재화 -> 상위 재화 변환
- 비가역성 유지(분해 불가)
- 수수료 없음(기본)

### 9.1 대표 교환 규칙
- GOLD_KEY_FRAGMENT 10개 -> GOLD_KEY_TICKET 1개
- DIAMOND_FRAGMENT 30개 -> DIAMOND_TICKET 1개
- 퍼즐 조각은 정책에 따라 합성한다.

### 9.2 교환 로그
- v2_exchange_log에 기록한다.
- 입력/출력 타입과 수량을 저장한다.
- 감사/운영 추적용이다.

## 10. 운영 제재 정책(Strict Vault Policy)
- `benefits_suspended=True` 유저는 상점/게임 이용 차단.
- 차단은 서비스 레이어에서 강제한다.
- HTTP 403 (BENEFITS_SUSPENDED)로 반환한다.

### 10.1 상태 정의
- ACTIVE: 최근 입금 7일 이내
- WARNING: 최근 입금 4~6일
- INACTIVE: 최근 입금 7일 이상
- ADMIN_FORCED: 어드민 강제 설정

### 10.2 정책 영향 범위
- 상점 구매 차단
- 유료 게임 차단
- 금고 한도 축소

## 11. 시간대 정책
- 모든 비즈니스 로직은 Asia/Seoul 기준.
- 운영일 리셋은 09:00 KST.
- Naive datetime 사용 금지.

### 11.1 운영일 정의
- 오늘 09:00 ~ 내일 08:59:59
- 미션/스트릭/출금 조건에 적용

## 12. 정책 충돌/정합성 표기
- 충돌 발견 시 🔴로 표기하고 최신 기준을 명시한다.
- 불명확/임시 허용은 🟡로 표기한다.

### 12.1 표기 예시
- 🔴 [정책/구현 충돌] benefits_suspended 차단 미구현
- 🟡 [정합성 검토 필요] UI Config 공백 알림 부재

## 13. 대표 플로우(고수준)
- 상품 조회: UI Config 읽기 -> visible 필터 -> 응답
- 구매: 잔액 검증 -> 차감 -> 로그 -> 지급
- 교환: 수량 검증 -> 로그 -> 지급

### 13.1 구매 플로우(상세)
1) 상품 스냅샷 확정
2) 결제 타입 정규화
3) 잔액 검증
4) 차감 처리
5) 구매 로그 기록
6) 보상 지급
7) 응답 반환

### 13.2 교환 플로우(상세)
1) 입력 재화 검증
2) 수량 검증
3) 교환 로그 기록
4) 결과 지급

## 14. 운영 리스크(핵심)
- Empty Shop Risk: UI Config 부재 시 상점 공백.
- 제재 미적용: benefits_suspended 체크 누락.
- CostType 불일치: legacy POINT/CC_POINT.

### 14.1 리스크 대응
- 공백 리스크: 기본 Config 또는 알림
- 제재 미적용: 서비스 레이어 차단
- CostType 불일치: 정규화 로직 적용

### 14.2 추가 주의사항
- 금고 SoT는 단일 필드만 사용
- Vault 합산 로직 금지
- Inventory/Wallet 혼용 금지

## 15. 검증 포인트(요약)
- 구매/교환 로직 트랜잭션 여부
- v2_shop_order/v2_exchange_log 적재
- UI Config 스키마 검증
- KST 09:00 기준 준수
- 재화 분류 매핑 정확성

## 16. 참조 문서
- v2_shop_exchange_policy_sot_ko.md
- v2_sot_shop_ko.md
- v2_shop_inventory_service_design_ko.md
- v2_inventory_shop_api_contract_ko.md
- 20260205_shop_cost_type_expansion.md
- 20260127_shop_cost_type_fix.md
- v2_strict_vault_policy_sot_ko.md
- v2_item_inventory_sot_ko.md

## 17. 체크리스트(요약)
- [ ] CostType 확장 반영 여부 확인
- [ ] benefits_suspended 차단 로직 확인
- [ ] UI Config 공백 알림/대체 확인
- [ ] Vault SoT 단일 기준 준수
- [ ] KST 09:00 정책 준수

## 18. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): Shop/Exchange 통합 SoT 01 작성
