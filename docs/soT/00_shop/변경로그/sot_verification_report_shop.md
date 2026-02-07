# V1 -> V2 상점 데이터 이관 검증 보고서

## 1. 개요
V1 백업 데이터에서 `shop_products` 설정을 추출하고, V2 SoT 정책(`v2_shop_exchange_policy_sot_ko.md`, `v2_item_inventory_sot_ko.md`)에 맞춰 변환안을 작성함.

## 2. 추출 데이터 (V1 Source)
- **Source**: `backup_20260114_v2.sql` (app_ui_config table)
- **Raw JSON**:
```json
{
  "products": {
    "PROD_GOLD_KEY_1": {
      "title": "골드키 교환권",
      "cost_amount": 30
    },
    "PROD_DIAMOND_KEY_1": {
      "title": "다이아키 교환권",
      "cost_amount": 100
    }
  }
}
```

## 3. 변환 규칙 및 근거
### 3.1 비용 단위 (Cost Unit)
- **현상**: V1 데이터에 `cost_amount`만 존재 (30, 100). 단위 미표기.
- **분석**: 키 교환권의 가치(30원/100원 불가능)와 V2 정책("다이아에서도 계산 가능")을 고려하여 **DIAMOND**로 판단.
- **적용**: `cost_type: "DIAMOND"` 명시.

### 3.2 보상 타입 (Reward Type)
- **현상**: V1 `PROD_GOLD_KEY_1` (Legacy Key naming).
- **SoT**: `v2_ticket_enum_sot_ko.md`에 의거 `_TICKET` 접미사 표준화.
- **적용**:
  - `PROD_GOLD_KEY_1` -> `GOLD_KEY_TICKET`
  - `PROD_DIAMOND_KEY_1` -> `DIAMOND_TICKET`

## 4. 최종 변환안 (V2 Schema)
`v2_shop_products.json`
```json
[
  {
    "product_id": "PROD_GOLD_KEY_1",
    "title": "골드키 교환권",
    "reward_type": "GOLD_KEY_TICKET",
    "cost_type": "DIAMOND",
    "cost_amount": 30,
    "sort_order": 10
  },
  {
    "product_id": "PROD_DIAMOND_KEY_1",
    "title": "다이아키 교환권",
    "reward_type": "DIAMOND_TICKET",
    "cost_type": "DIAMOND",
    "cost_amount": 100,
    "sort_order": 20
  }
]
```

## 5. 실행 계획
1. 어드민 페이지(`AdminShopConfig`)에서 위 JSON을 `v2_shop_products` 키로 저장.
2. 상점 API 호출 테스트 (`GET /api/v2/shop/products`)로 응답 확인.
3. 구매 테스트: 다이아 보유 시 정상 구매 및 `UserGameWallet` 티켓 증가 확인.
