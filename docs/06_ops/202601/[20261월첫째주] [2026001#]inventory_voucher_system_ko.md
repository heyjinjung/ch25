# 2026 인벤토리(아이템) + 교환권(바우처) 시스템 설계서 (Frontend UI 포함)

## 0) 배경 / 문제
- 미션에서 지급되는 `DIAMOND`(다이아)를 “상점 구매”나 “회원 인벤토리”에서 확인/사용해야 하는데, 현재 시스템은 **토큰 지갑(`user_game_wallet`)만 존재**하고 “아이템 인벤토리”가 없다.
- 요구사항: **다이아 30개로 ‘골드키 교환권’을 구매**, *다이아 50개로 ‘다이아몬드키 교환권’을 구매*, 교환권은 **인벤토리에 쌓아두었다가 나중에 사용**(= 실제 `GOLD_KEY` 지급)할 수 있어야 한다. 즉 다이아, 골드키, 다이아몬드 키는 보관이 되어야함 
  - 참고: Ticket Zero 대응(`TRIAL_GRANT`)은 **티켓 3종만** 대상이며, 키(`GOLD_KEY`/`DIAMOND_KEY`)는 체험 지급 대상이 아닙니다.

## 1) 목표 / 비목표

### 목표
1. “인벤토리 v1”을 **스택형 아이템(교환권)** 중심으로 최소 구현한다.
2. `DIAMOND`로 상품을 구매하면 기본적으로 **교환권 아이템을 지급**하는 구조를 유지하되,
   - **키/티켓류(예: `GOLD_KEY`/`DIAMOND_KEY`/`ROULETTE_COIN`/`DICE_TOKEN`/`LOTTERY_TICKET`)는 구매 시 교환권을 즉시 자동 소비(auto-fulfill)하여 지갑에 바로 반영**할 수 있다.
  - **기프티콘/외부플랫폼류(예: `BAEMIN_GIFTICON_*`, `COMPOSE_AMERICANO_GIFTICON_3000`, `CC_COIN_GIFTICON`)는 인벤토리에 지급대기 아이템으로 남겨 운영자가 수동 발송/관리**한다.
3. 유저는 인벤토리에서 교환권을 확인하고(필요 시) **사용(consume)**하여 보상을 얻는다.
4. 모든 변화는 **원자적으로 처리**되고(중복 지급/중복 차감 방지), **장부(ledger)** 로 추적 가능해야 한다.

### 비목표(이번 v1에서 하지 않음)
- 장비/스킨 같은 “비-스택형/개별 인스턴스 아이템(UID)” 시스템
- 마켓/거래소(유저 간 거래)
- 복잡한 쿠폰/시리얼 코드(외부 쿠폰은 기존 `COUPON` 경로로 별도)

## 2) 용어 정의
- **Wallet(지갑)**: `user_game_wallet` 기반, 수량형 토큰(티켓/키/다이아 등) 잔액.
- **Inventory(인벤토리)**: “아이템(교환권)” 보유 수량을 저장하는 새 테이블.
- **Voucher(교환권/바우처)**: 인벤토리에 쌓이는 아이템. 사용 시 정해진 보상을 지급한다.

## 3) 데이터 모델(Backend/DB)

### 3.1 기존 재사용: `user_game_wallet`
- `token_type`: `DIAMOND`, `GOLD_KEY`, `DIAMOND_KEY`, `ROULETTE_COIN` 등
- 미션 보상 다이아는 이미 `DIAMOND` 토큰으로 지급됨 → 인벤토리(voucher)와 분리 유지?? 아니 이게 미션보상 다이아가 인벤토리 안으로 들어가야함

### 3.2 신규: `user_inventory_item` (스택형 아이템 인벤토리)
**목적**: 유저별 `item_type` 수량을 저장.

필드(제안):
- `id` (PK)
- `user_id` (FK -> user.id, index)
- `item_type` (VARCHAR(50), index)
- `quantity` (INT, >=0)
- `created_at`, `updated_at`

제약:
- `UNIQUE(user_id, item_type)`
- `CHECK(quantity >= 0)`

### 3.3 신규: `user_inventory_ledger` (아이템 장부)
**목적**: 교환권 지급/사용/회수 이력 추적(디버깅/CS/감사).

필드(제안):
- `id` (PK)
- `user_id` (index)
- `item_type`
- `delta` (INT, 지급 + / 사용 -)
- `balance_after` (INT)
- `reason` (ex: `SHOP_PURCHASE`, `VOUCHER_USE`, `ADMIN_GRANT`, `ADMIN_REVOKE`)
- `meta_json` (JSON)
- `idempotency_key` (nullable, UNIQUE 옵션)
- `created_at`

### 3.4 Voucher 정의(아이템 타입)
아이템 타입은 문자열로 시작(필요 시 Enum으로 고도화):
- `VOUCHER_GOLD_KEY_1` : 사용 시 `GOLD_KEY +1`
- (확장) `VOUCHER_DIAMOND_KEY_1`
- (확장) `VOUCHER_TICKET_BUNDLE_SMALL` 등

### 3.5 Shop 상품 정의(최소 v1)
상품은 초기에는 “서버 상수/DB 설정” 둘 중 하나로 설계 가능.

**권장(운영 편의)**: `shop_product` 테이블(또는 config JSON)로 운영자가 on/off 및 가격 조정 가능.

필드(제안):
- `id`, `sku`(고정 문자열), `title`, `description`
- `cost_token_type` = `DIAMOND`
- `cost_amount` = `30`
- `grant_item_type` = `VOUCHER_GOLD_KEY_1`
- `grant_amount` = `1`
- `is_active`, `starts_at`, `ends_at`

## 4) 핵심 플로우(원자성/중복 방지)

### 4.1 상점 구매: 다이아 → 교환권 적립
1. 클라이언트가 상품 구매 요청
2. 서버가 트랜잭션으로:
   - `DIAMOND` 30 차감 (잔액 부족 시 실패)
   - `user_inventory_item(VOUCHER_GOLD_KEY_1).quantity += 1`
   - wallet/item 각각 ledger 기록

중복 방지:
- `Idempotency-Key` 헤더(또는 payload 필드) 지원
- 동일 키로 재요청 시 “이미 처리됨” 응답(같은 결과 반환)

### 4.2 인벤토리 사용: 교환권 → 골드키 지급
1. 클라이언트가 교환권 사용 요청(수량 1 또는 N)
2. 서버가 트랜잭션으로:
   - `user_inventory_item.quantity -= N` (부족 시 실패)
   - `GOLD_KEY += N` 지급
   - ledger 기록

## 5) API 설계(초안)

### 5.1 인벤토리 조회
`GET /api/inventory`

Response (예시):
```json
{
  "wallet": {
    "DIAMOND": 120,
    "GOLD_KEY": 3,
    "DIAMOND_KEY": 0
  },
  "items": [
    { "item_type": "VOUCHER_GOLD_KEY_1", "quantity": 2 }
  ]
}
```

### 5.2 상점 상품 목록
`GET /api/shop/products`

Response (예시):
```json
[
  {
    "sku": "VOUCHER_GOLD_KEY_1_X1",
    "title": "골드키 교환권",
    "cost": { "token_type": "DIAMOND", "amount": 30 },
    "grants": [{ "item_type": "VOUCHER_GOLD_KEY_1", "quantity": 1 }],
    "is_active": true
  }
]
```

### 5.3 구매
`POST /api/shop/purchase`

Request (예시):
```json
{ "sku": "VOUCHER_GOLD_KEY_1_X1" }
```

Headers:
- `Idempotency-Key: <uuid>`

Response (예시):
```json
{
  "result": "OK",
  "wallet": { "DIAMOND": 90 },
  "items_delta": [{ "item_type": "VOUCHER_GOLD_KEY_1", "delta": 1 }]
}
```

### 5.4 교환권 사용
`POST /api/inventory/use`

Request (예시):
```json
{ "item_type": "VOUCHER_GOLD_KEY_1", "quantity": 1 }
```

Headers:
- `Idempotency-Key: <uuid>`

Response (예시):
```json
{
  "result": "OK",
  "items_delta": [{ "item_type": "VOUCHER_GOLD_KEY_1", "delta": -1 }],
  "wallet_delta": [{ "token_type": "GOLD_KEY", "delta": 1 }]
}
```

## 6) 프론트엔드 UI/UX 설계 (Telegram Mini App 스타일)

### 6.1 내비게이션(최소)
- 하단/사이드 메뉴에 2개 항목 추가(또는 기존 페이지에서 진입 버튼):
  - `상점(Shop)`
  - `인벤토리(Inventory)`

### 6.2 Inventory Page (인벤토리)
**목표**: “내가 가진 다이아/키/티켓(지갑)” + “교환권(아이템)”을 한 화면에서 확인하고, 교환권을 사용한다.

구성(권장):
- 상단: `DIAMOND` 잔액 큰 표시(미션 루프 연결)
- 탭 2개:
  - `재화`(wallet): DIAMOND / GOLD_KEY / DIAMOND_KEY / 티켓류
  - `아이템`(items): 교환권 리스트

Wireframe(텍스트):
```
┌─────────────────────────┐
│ 인벤토리                 │
│ DIAMOND 120              │
├───────────────┬─────────┤
│   재화         │  아이템  │  (tabs)
├─────────────────────────┤
│ [재화 탭]                 │
│ GOLD_KEY      3           │
│ DIAMOND_KEY   0           │
│ ROULETTE_COIN 10          │
│ ...                       │
├─────────────────────────┤
│ [아이템 탭]               │
│ 골드키 교환권   x2  [사용]│
│ 다이아키 교환권 x0  [사용]│ (비활성)
└─────────────────────────┘
```

교환권 사용 UX:
- `사용` 클릭 → 모달
  - 보유 수량 표시
  - 사용 수량 선택(기본 1, 최대 보유량)
  - “사용하기” 확정
- 성공 시 토스트:
  - `골드키 +1 지급 완료`
  - 인벤토리/지갑 즉시 갱신

### 6.3 Shop Page (상점)
**목표**: 다이아로 교환권을 구매해 인벤토리에 적립.

Wireframe(텍스트):
```
┌─────────────────────────┐
│ 상점                      │
│ DIAMOND 120               │
├─────────────────────────┤
│ [상품 카드]               │
│ 골드키 교환권              │
│ 가격: DIAMOND 30          │
│ 보상: 교환권 x1(인벤 저장) │
│            [구매하기]      │
└─────────────────────────┘
```

구매 UX:
- “구매하기” 클릭 → 확인 모달(가격/지급 아이템 재확인)
- 잔액 부족 시:
  - `다이아가 부족합니다` 토스트
  - CTA: 미션 페이지로 이동(선택)

### 6.4 컴포넌트 설계(권장)
- `src/pages/InventoryPage.tsx`
- `src/pages/ShopPage.tsx`
- `src/components/inventory/WalletBalanceGrid.tsx`
- `src/components/inventory/ItemRow.tsx`
- `src/components/shop/ProductCard.tsx`
- `src/api/inventoryApi.ts`, `src/api/shopApi.ts`
- 상태 관리:
  - React Query로 `["inventory"]`, `["shop-products"]` 캐시
  - 미션 보상 수령 후 `inventory` invalidate(지갑 DIAMOND가 변하므로)

## 7) 운영/관리(추가 옵션)
- 관리자 UI에서:
  - 특정 유저에게 교환권 지급/회수(아이템 인벤토리)
  - 상품 on/off, 가격 변경(ShopProduct)

## 8) 테스트 전략(최소)
- 단위/통합:
  - “구매 시 DIAMOND 차감 + 교환권 +1” 원자성 테스트
  - “사용 시 교환권 -1 + GOLD_KEY +1” 원자성 테스트
  - 중복 요청(Idempotency-Key) 재호출 시 중복 지급/차감이 없는지
- E2E(선택):
  - 미션 완료 → 다이아 획득 → 상점 구매 → 인벤 적립 → 인벤에서 사용 → 골드키 증가

## 9) 단계적 구현 플랜(권장)
1. Backend: `user_inventory_item`/ledger + `/api/inventory` + `/api/inventory/use`
2. Backend: `/api/shop/products` + `/api/shop/purchase` (DIAMOND 차감 + voucher 지급)
3. Frontend: InventoryPage + ShopPage + React Query 연동
4. Admin(선택): 아이템 지급/회수 + 상품 관리 UI

