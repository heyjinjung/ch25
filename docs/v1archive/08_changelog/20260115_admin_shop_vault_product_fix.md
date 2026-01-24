# Development Log (2026-01-15) - Shop Improvements

## 1. Admin Shop VAULT 상품 저장 오류 수정 (Enum 직렬화)

### 문제
- **Issue**: 어드민 상점 페이지에서 금고 잔액(VAULT)을 결제 토큰으로 사용하는 상품이 저장되지 않는 문제 발생
- **Impact**: VAULT 토큰 기반 상품 등록 불가
- **Root Cause**: `model_dump()` 호출 시 `mode='json'` 누락으로 Enum 객체 직렬화 실패

### 수정 내용
- **File**: `app/api/admin/routes/admin_shop.py` (Line 78)
- **Change**: `payload.products[sku].model_dump(mode='json', exclude_none=True)` 적용

---

## 2. Shop 금고 → 티켓 직결 지급 로직 수정 (보상 시스템 개선)

### 문제
- **Issue**: 금고(VAULT)로 결제하여 티켓(ROULETTE_COIN 등)을 구매할 때, 즉시 사용 가능한 티켓이 아닌 "티켓교환권(Voucher)"이 지급되는 현상
- **Impact**: 사용자가 티켓을 구매한 후 다시 인벤토리에서 "사용하기"를 눌러야 하는 번거로움 발생 및 티켓교환권 작동 불능 문제 보고
- **Cause**: 상점 구매 시스템이 모든 보상을 `InventoryService`를 거쳐 지급하고, 특정 바우처 이름(`VOUCHER_*`)만 자동 전환하도록 하드코딩되어 있었음

### 수정 내용

#### Backend: [app/services/shop_service.py](file:///c:/Users/JAVIS/ch/ch25/app/services/shop_service.py)
- **Direct Grant Logic**: 결제 재화가 `VAULT`이고 보상 아이템이 직접적인 토큰 타입(ROULETTE_COIN, DICE_TOKEN 등)인 경우, 인벤토리를 우회하여 `GameWalletService`에 직접 토큰을 지급하도록 로직 변경
- **코드 변경점**:
  - `is_vault_purchase` 및 `is_direct_token` (ROULETTE_COIN, DICE_TOKEN 등) 여부 확인
  - 위 조건 충족 시 `GameWalletService.grant_tokens()` 직접 호출하여 가용 잔액 즉시 증가

### 기대 효과
- **UX 개선**: 금고 잔액으로 티켓 구매 시 인벤토리를 거치지 않고 즉시 게임 플레이 가능 (중간 단계 제거)
- **유연성**: 어드민에서 유동적으로 티켓 직접 지급 상품 구성 가능

### 검증
- ✅ 금고 결제 상품 구매 시 `user_game_wallet` 테이블에 즉시 수량 반영 확인
- ✅ 구매 결과 응답(Response)에 `reward_token` 및 `reward_amount` 즉시 반환 확인
- ✅ 서버 배포 및 실환경 테스트 완료
