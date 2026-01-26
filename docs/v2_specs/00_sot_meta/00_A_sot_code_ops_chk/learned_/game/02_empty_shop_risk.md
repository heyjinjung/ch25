# 02_empty_shop_risk.md 🟡

## 한줄 요약
**문제**: 상점 UI Config가 없거나 비어있을 때 상점이 공백으로 노출되어 운영 리스크가 발생합니다. 운영자 알림과 사용자 대체 메시지(또는 기본 상품 제공)가 필요합니다.

---

## 영향 범위
- 코드: `app/v2/api/routes.py` `list_shop_products()`
- 운영: UI Config 관리 실수 시 상점 공백(영업 손실)

---

## 단계별 가이드
### 1) 탐지/모니터링 추가
- When `list_shop_products()` returns an empty list for >X minutes, trigger:
  - Sentry event `shop_empty_products`
  - Ops Slack alert with timestamp and environment
- Implement a metric `shop.product_count` and monitor in Grafana

### 2) 서비스 레이어 보강 (Fallback)
- Behavior: If DB/UI Config returns empty:
  - Option A (Preferred): return `{"products": [], "status":"maintenance"}` with `Retry-After` header and set HTTP 200
  - Option B: fallback to `default_shop_products` (a small curated list in code/DB)
- Code locations:
  - `app/v2/api/routes.py` -> `list_shop_products()`
  - `app/v2/services/shop_service.py` -> `load_products()` add fallback

### 3) 운영/관리 UI 보호
- Add validation in Ops product editor: prevent saving an empty product list without an active maintenance flag
- Add pre-save hook that warns the operator and requires explicit confirmation

---

## Tests
- Unit:
  - `test_list_shop_products_returns_maintenance_when_empty` (assert maintenance status and header)
  - `test_list_shop_products_fallback_default` (ensure fallback list returned)
- E2E:
  - Simulate empty DB/config in staging → assert alert generated and UI shows maintenance message

---

## Ops Checklist
- [ ] Configure alert: `shop.product_count == 0` → Slack
- [ ] Prepare default fallback product set (documented JSON in `docs/ops/default_shop_products.json`)
- [ ] Runbook: steps to restore UI Config from last known good config (DB backup location, who to call)

---

## Verify
- Simulate empty configuration in staging for 10 minutes → verify alert and UI message
- Confirm fallback list used if chosen

---

> Note: prioritize non-destructive behavior: prefer showing maintenance message over auto-filling unexpected products.