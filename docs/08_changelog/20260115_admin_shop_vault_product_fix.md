# Development Log (2026-01-15)

## Admin Shop VAULT 상품 저장 오류 수정

### 문제
- **Issue**: 어드민 상점 페이지에서 금고 잔액(VAULT)을 결제 토큰으로 사용하는 상품이 저장되지 않는 문제 발생
- **Impact**: VAULT 토큰 기반 상품 등록 불가

### 근본 원인
- **File**: `app/api/admin/routes/admin_shop.py` (Line 78)
- **Problem**: Pydantic `model_dump(exclude_none=True)` 호출 시 `GameTokenType` enum 객체가 문자열로 변환되지 않음
  ```python
  # Before (문제)
  {'cost_token': <GameTokenType.VAULT: 'VAULT'>}
  
  # After (정상)
  {'cost_token': 'VAULT'}
  ```
- **Root Cause**: `mode='json'` 옵션 없이 `model_dump()` 호출 시 enum이 객체로 반환되어 JSON 직렬화 실패

### 수정 내용

#### Backend
**[app/api/admin/routes/admin_shop.py](file:///c:/Users/JAVIS/ch/ch25/app/api/admin/routes/admin_shop.py#L78)**
```diff
  updates = {
-     sku: patch.model_dump(exclude_none=True)
+     sku: patch.model_dump(mode='json', exclude_none=True)
      for sku, patch in payload.products.items()
  }
```

### 검증
- ✅ `tests/test_shop_overrides.py`: 전체 테스트 통과
- ✅ Enum 직렬화: `GameTokenType.VAULT` → `"VAULT"` 정상 변환 확인

### Impact
- VAULT 토큰 기반 상품(금고 Buy-in 상품) 정상 등록 가능
- 모든 `GameTokenType` enum이 올바르게 JSON 직렬화됨
