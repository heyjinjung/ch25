[작성일: 2026-02-05]
[상태: SoT]
[도메인: SHOP/INVENTORY]

# 상점 결제재화(CostType) 확장 구현

## 개요
상점에서 **모든 보상타입 = 결제재화 = 획득재화** 원칙에 따라 CostType을 확장하여, 기존 VAULT/DIAMOND 외에 모든 게임 토큰으로 결제 가능하도록 수정.

## 변경 내역

### 1. v2_constants.py - CostType 추가
**파일**: `app/v2/schemas/v2_constants.py`

```python
CostType = Literal[
    # === 금고 (Vault) ===
    "VAULT",       # SoT: vault_locked_balance에서 차감
    "POINT",       # Legacy alias for VAULT
    "CC_POINT",    # Legacy alias for VAULT

    # === 게임 지갑 토큰 (GameWallet) ===
    "DIAMOND",
    "ROULETTE_TICKET",
    "DICE_TICKET",
    "LOTTERY_TICKET",
    "GOLD_KEY_TICKET",
    "DIAMOND_TICKET",
    "TRIAL_TICKET",
    "GOLD_KEY_FRAGMENT",
    "DIAMOND_FRAGMENT",
    "PUZZLE_C1",
    "PUZZLE_C2",
    "PUZZLE_J",
    "PUZZLE_M",
]

GAME_TOKEN_COST_TYPES: frozenset[str] = frozenset({
    "DIAMOND", "ROULETTE_TICKET", "DICE_TICKET", "LOTTERY_TICKET",
    "GOLD_KEY_TICKET", "DIAMOND_TICKET", "TRIAL_TICKET",
    "GOLD_KEY_FRAGMENT", "DIAMOND_FRAGMENT",
    "PUZZLE_C1", "PUZZLE_C2", "PUZZLE_J", "PUZZLE_M",
})
```

### 2. shop_service.py - 결제 로직 확장
**파일**: `app/v2/services/shop_service.py`

**변경 내용**:
- `GAME_TOKEN_COST_TYPES` import 추가
- 결제 타입 검증: `VAULT` 또는 `GAME_TOKEN_COST_TYPES` 중 하나여야 함
- 게임 토큰 결제 시 `GameTokenType(normalized_cost)`로 동적 변환 후 차감

```python
from app.v2.schemas.v2_constants import GAME_TOKEN_COST_TYPES

# 검증
if normalized_cost != "VAULT" and normalized_cost not in GAME_TOKEN_COST_TYPES:
    raise ValueError("INVALID_COST_TYPE")

# 차감
elif normalized_cost in GAME_TOKEN_COST_TYPES:
    token_type = GameTokenType(normalized_cost)
    V2InventoryService.consume_wallet_tokens(db, user_id, token_type, cost_amount, ...)
```

### 3. v2_shop_exchange.py - 스키마 타입 변경
**파일**: `app/v2/schemas/v2_shop_exchange.py`

```python
# 변경 전
cost_type: Literal["VAULT"]

# 변경 후
from app.v2.schemas.v2_constants import CostType
cost_type: CostType
```

## 지원 결제재화 목록

| 분류 | 타입 | 저장소 |
|------|------|--------|
| 금고 | VAULT, POINT, CC_POINT | User.vault_locked_balance |
| 다이아 | DIAMOND | UserGameWallet |
| 티켓 | ROULETTE_TICKET, DICE_TICKET, LOTTERY_TICKET | UserGameWallet |
| 프리미엄 티켓 | GOLD_KEY_TICKET, DIAMOND_TICKET, TRIAL_TICKET | UserGameWallet |
| 조각 | GOLD_KEY_FRAGMENT, DIAMOND_FRAGMENT | UserGameWallet |
| 퍼즐 | PUZZLE_C1, PUZZLE_C2, PUZZLE_J, PUZZLE_M | UserGameWallet |

## 제외 항목

| 분류 | 사유 |
|------|------|
| 기프티콘 | 최종 상품이므로 결제 수단에서 제외 |

## 검증

- **Import 테스트**: 모든 모듈 import 성공
- **단위 테스트**: `tests/v2/test_inventory_shop.py` 23개 테스트 통과

## 관련 문서

- [v2_shop_exchange_policy_sot_ko.md](../../../01_core/v2_shop_exchange_policy_sot_ko.md)
- [v2_constants.py](../../../../../../app/v2/schemas/v2_constants.py)
- [shop_service.py](../../../../../../app/v2/services/shop_service.py)
