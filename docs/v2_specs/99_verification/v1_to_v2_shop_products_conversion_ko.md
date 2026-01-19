문서 타입: 운영 가이드
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: 운영/개발
상태: SoT

# V1 shop_products → V2 변환 가이드 (V1 to V2 Conversion Guide)

## 1. 목적 (Purpose)
V1의 `shop_products` JSON을 V2 SoT 기준으로 변환하고 검증하여, 운영 설정에 바로 적용 가능한 `v2_shop_products` 데이터를 생성한다.

## 2. 변환 근거 (Source)
- V1 원본: `backup_20260105.sql` → `shop_products` UI Config
- V2 SoT: [v2_shop_products_ui_config_sot_ko.md](v2_shop_products_ui_config_sot_ko.md)
- V2 상점 로직: [app/v2/api/routes.py](../../app/v2/api/routes.py#L420-L530)

## 3. V1 원본 JSON (Extracted)
```json
{
  "products": {
    "PROD_GOLD_KEY_1": {
      "title": "골드키 교환",
      "is_active": true,
      "cost_amount": 30
    },
    "PROD_DIAMOND_KEY_1": {
      "title": "다이아키 교환",
      "is_active": true,
      "cost_amount": 100
    },
    "PROD_TICKET_COIN_1": {
      "title": "룰렛교환",
      "is_active": true,
      "cost_amount": 1
    },
    "PROD_TICKET_DICE_1": {
      "title": "주사위교환",
      "is_active": true,
      "cost_amount": 2
    }
  }
}
```

**V1 가격 체계 설명**:
- V1의 `cost_amount`는 **실제 금액(원)이 아니라 티켓 개수** 기준입니다.
- 예: `cost_amount: 1` = 티켓 1개로 교환 가능
- V2에서는 Vault 포인트(실제 금액) 기준으로 전환됩니다.

## 4. V1 → V2 변환 규칙 (Conversion Rules)
### 4.1 구조 변경
- V1 형식: `{ "products": { "SKU_KEY": {...} } }`
- V2 형식: `[ { "product_id": "SKU_KEY", ... } ]` (배열)

### 4.2 필드 매핑
| V1 필드         | V2 필드         | 변환 규칙                                      |
| :-------------- | :-------------- | :--------------------------------------------- |
| (key)           | product_id      | V1 key를 그대로 product_id로                  |
| title           | title           | 동일                                           |
| is_active       | visible         | 필드명 변경                                    |
| cost_amount     | cost_amount     | **V1: 티켓 개수 → V2: Vault 포인트 환산 필요** |
| (없음)          | reward_type     | **수동 매핑 필요**                             |
| (없음)          | reward_amount   | 기본값 1 (SKU별 추론 가능)                     |
| (없음)          | sort_order      | 자동 생성 (10, 20, 30...)                      |

### 4.3 SKU → reward_type 매핑 (Manual Mapping)
V1 상품 ID에서 reward_type을 추론하고, 티켓 개수 기반 가격을 Vault 포인트로 환산합니다.

| V1 SKU                | V1 cost (티켓 개수) | 추론 reward_type     | reward_amount | V2 cost (Vault) | 환산 근거                           |
| :-------------------- | :------------------ | :------------------- | :------------ | :-------------- | :---------------------------------- |
| PROD_GOLD_KEY_1       | 30개                | GOLD_KEY_TICKET      | 1             | 3000            | 티켓 1개당 100 포인트 환산          |
| PROD_DIAMOND_KEY_1    | 100개               | DIAMOND_TICKET       | 1             | 10000           | 티켓 1개당 100 포인트 환산          |
| PROD_TICKET_COIN_1    | 1개                 | ROULETTE_TICKET      | 1             | 100             | 티켓 1개당 100 포인트 환산          |
| PROD_TICKET_DICE_1    | 2개                 | DICE_TICKET          | 1             | 200             | 티켓 1개당 100 포인트 환산          |

**환산 기준**: V1 티켓 1개 = V2 Vault 100 포인트 (금고 정책 SoT 기준)

## 5. V2 허용 reward_type (현재 로직 기준)
V2 상점 purchase 로직이 **실제로 처리 가능한 reward_type**:
```python
# app/v2/api/routes.py 기준
SUPPORTED_REWARD_TYPES = [
    "ROULETTE_TICKET",
    "DICE_TICKET",
    "LOTTERY_TICKET",
    "GOLD_KEY_TICKET",
    "DIAMOND_TICKET",
    "TRIAL_TICKET",
    "DIAMOND",           # 인벤토리 아이템
    "POINT",             # Vault 포인트
    "CC_POINT",          # Vault CC 포인트
]
```

## 6. V2 변환 결과 (v2_shop_products)
```json
[
  {
    "product_id": "PROD_TICKET_COIN_1",
    "title": "룰렛 티켓 1장",
    "description": "바로 사용 가능한 룰렛 티켓",
    "reward_type": "ROULETTE_TICKET",
    "reward_amount": 1,
    "cost_amount": 100,
    "visible": true,
    "sort_order": 10,
    "tags": ["ticket", "roulette"]
  },
  {
    "product_id": "PROD_TICKET_DICE_1",
    "title": "주사위 티켓 1장",
    "description": "바로 사용 가능한 주사위 티켓",
    "reward_type": "DICE_TICKET",
    "reward_amount": 1,
    "cost_amount": 200,
    "visible": true,
    "sort_order": 20,
    "tags": ["ticket", "dice"]
  },
  {
    "product_id": "PROD_GOLD_KEY_1",
    "title": "골드키 1개",
    "description": "특별 보상 키 (V1: 티켓 30개 가치)",
    "reward_type": "GOLD_KEY_TICKET",
    "reward_amount": 1,
    "cost_amount": 3000,
    "visible": true,
    "sort_order": 30,
    "tags": ["key", "gold"]
  },
  {
    "product_id": "PROD_DIAMOND_KEY_1",
    "title": "다이아 키 1개",
    "description": "프리미엄 보상 키 (V1: 티켓 100개 가치)",
    "reward_type": "DIAMOND_TICKET",
    "reward_amount": 1,
    "cost_amount": 10000,
    "visible": true,
    "sort_order": 40,
    "tags": ["key", "diamond"]
  }
]
```

## 7. V2 SoT 검증 결과 (Validation)
### 7.1 필수 필드 체크
- [x] product_id 존재
- [x] title 존재
- [x] reward_type 존재 (V2 로직 허용 범위 내)
- [x] reward_amount >= 1
- [x] cost_amount >= 1
- [x] visible = true
- [x] sort_order 설정

### 7.2 규칙 준수 체크
- [x] reward_type이 V2 상점 로직의 허용 타입 목록에 포함됨
- [x] 금액/수량이 정수이며 양수임
- [x] visible=true로 전체 노출
- [x] V2 티켓 네이밍 적용 (ROULETTE_TICKET, DICE_TICKET...)

### 7.3 변환 로직 설명
- **V1 가격 체계**: 티켓 개수 기반 (cost_amount=1 → 티켓 1개로 교환 가능)
- **V2 가격 체계**: Vault 포인트 기반 (실제 금액)
- **환산 기준**: 티켓 1개 = Vault 100 포인트
  - V1 cost=1 → V2 cost=100
  - V1 cost=2 → V2 cost=200
  - V1 cost=30 → V2 cost=3000
  - V1 cost=100 → V2 cost=10000
- **확인 필요**: 티켓당 100 포인트 환산율은 금고 정책 SoT 기준이며, 실제 운영 정책과 협의 필요.

## 8. 운영 적용 절차 (Deployment Steps)
1) UI Config 테이블에 `v2_shop_products` 키 생성
2) 위 JSON을 value 컬럼에 삽입
3) GET /api/v2/shop/products 호출 → 4개 상품 반환 확인
4) POST /api/v2/shop/purchase 테스트 → 금고 차감/티켓 지급 확인
5) 티켓 환산율(1개=100pt) 검증 및 필요 시 조정

## 9. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
