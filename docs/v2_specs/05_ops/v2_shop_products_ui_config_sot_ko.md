문서 타입: SoT
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/운영
상태: SoT

# V2 상점 상품 UI Config SoT (v2_shop_products)

## 1. 목적 (Purpose)
`v2_shop_products` UI Config 키의 구조와 검증 규칙을 표준화하여, **상점 목록이 빈 배열로 내려오는 문제**를 방지하고 V2 상점 정책/보상 매핑을 준수한다.

## 2. 범위 (Scope)
- 대상 키: `v2_shop_products`
- 저장 위치: UI Config (운영 설정 저장소)
- 적용 API: `GET /api/v2/shop/products`, `POST /api/v2/shop/purchase`

## 3. SoT 규칙 (Source of Truth)
- 상점 비용 SoT: `user.vault_locked_balance` (현금 잔액 사용) + 다이아(인벤토라)
- 보상 타입 SoT: `v2_reward_type_standard_sot_ko.md`
- 티켓 네이밍 SoT: `v2_ticket_enum_sot_ko.md`
- 아이템/인벤토리 SoT: `v2_item_inventory_sot_ko.md`
- 상점 정책 SoT: `v2_shop_exchange_policy_sot_ko.md`

## 4. 필수 규칙 (Hard Rules)
1) 키가 없거나 비어있으면 **상점 목록이 빈 배열**로 반환된다.
2) 비용은 `vault_locked_balance` 기준, 인벤토리에 저장되는 다이아에서도 계산이 가능하다
3) 금액/수량은 **정수**이며 0 또는 음수 금지.
4) `reward_type`은 SoT 표준 타입만 허용.
5) 티켓 보상은 **V2 티켓 네이밍**을 사용한다.

## 5. 스키마 (Schema)
`v2_shop_products`는 **배열**이며, 각 항목은 아래 구조를 가진다.

### 5.1 필수 필드
- `product_id` (string): 고유 상품 ID
- `title` (string): 표시 이름
- `reward_type` (string): 보상 타입 (예: `ROULETTE_TICKET`, `LOTTERY_TICKET`, `DICE_TICKET`, `UNIVERSAL_TICKET`, `DIAMOND`, `POINT`, `CC_POINT`)
- `reward_amount` (int): 보상 수량
- `cost_type` (string): 비용 타입 (기본: `VAULT`, 옵션: `DIAMOND`)
- `cost_amount` (int): 비용 금액
- `visible` (bool): 노출 여부
- `sort_order` (int): 노출 순서 (오름차순)

### 5.2 선택 필드
- `description` (string): 보조 설명
- `image_url` (string): 카드 이미지 URL
- `badge` (string): 뱃지 텍스트 (예: "HOT", "LIMITED")
- `stock_limit` (int|null): 재고 제한 (null이면 무제한)
- `purchase_limit_per_user` (int|null): 유저당 구매 제한 (null이면 무제한)
- `tags` (string[]): 필터 태그
- `starts_at` (string|null): ISO8601 시작 시각 (없으면 상시)
- `ends_at` (string|null): ISO8601 종료 시각 (없으면 상시)

## 6. 검증 규칙 (Validation)
- `reward_amount` >= 1
- `cost_amount` >= 1
- `sort_order`는 중복 허용하되, 동일 시각 표시 순서가 예측 가능해야 함
- `starts_at` < `ends_at` (둘 다 존재할 때)
- `visible=false` 항목은 응답에서 필터링 가능

## 7. 예시 (Sample JSON)
```json
[
  {
    "product_id": "roulette_ticket_1",
    "title": "룰렛 티켓 1장",
    "description": "오늘 바로 사용 가능",
    "reward_type": "ROULETTE_TICKET",
    "reward_amount": 1,
    "cost_amount": 200,
    "visible": true,
    "sort_order": 10,
    "tags": ["ticket", "daily"],
    "badge": "HOT"
  },
  {
    "product_id": "diamond_5",
    "title": "다이아 5개",
    "reward_type": "DIAMOND",
    "reward_amount": 5,
    "cost_amount": 500,
    "visible": true,
    "sort_order": 20
  },
  {
    "product_id": "cc_point_1000",
    "title": "CC 포인트 1000",
    "reward_type": "CC_POINT",
    "reward_amount": 1000,
    "cost_amount": 1000,
    "visible": false,
    "sort_order": 30
  }
]
```

## 8. 운영/검증 (QA)
- [ ] `v2_shop_products` 키 존재
- [ ] 비용이 Vault 기준으로 설정됨
- [ ] 보상 타입이 SoT 표준을 준수함
- [ ] 금액/수량이 정수로 설정됨
- [ ] 노출/기간 조건 정상 동작

## 9. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
