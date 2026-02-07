문서 타입: API 계약
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/기획
상태: SoT

# V2 Inventory & Shop API 계약

## 1. 목적 (Purpose)
인벤토리/상점 V2 API 계약을 정의한다.

## 2. 범위 (Scope)
- 인벤토리 조회/사용
- 상점 상품 목록/구매

## 3. API 계약 (Contract)
### 3.1 인벤토리 조회
- Endpoint: `GET /api/v2/inventory`
- Response:
```json
{
  "items": [
    {"item_type": "ROULETTE_TICKET", "quantity": 3, "created_at": "2026-01-19T12:00:00"}
  ],
  "wallet": {"ROULETTE_TICKET": 3, "DICE_TICKET": 1}
}
```

### 3.2 인벤토리 아이템 사용
- Endpoint: `POST /api/v2/inventory/use`
- Headers: `Idempotency-Key` (선택)
- Request:
```json
{ "item_type": "VOUCHER_STARBUCKS", "amount": 1 }
```

### 3.3 상점 상품 목록
- Endpoint: `GET /api/v2/shop/products`

### 3.4 상점 상품 구매
- Endpoint: `POST /api/v2/shop/purchase`
- Headers: `Idempotency-Key` (선택)
- Request:
```json
{ "sku": "TICKET_ROULETTE_10" }
```

## 4. 오류 규칙 (Errors)
- `MISSING_ITEM_TYPE`
- `MISSING_SKU`
- `INSUFFICIENT_BALANCE`

## 5. 근거 (Source)
- 상점/교환소 정책 SoT: [docs/v2_specs/01_core/v2_shop_exchange_policy_sot_ko.md](../01_core/v2_shop_exchange_policy_sot_ko.md#L1)
- 아이템/인벤토리 SoT: [docs/v2_specs/01_core/v2_item_inventory_sot_ko.md](../01_core/v2_item_inventory_sot_ko.md#L1)

## 6. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
