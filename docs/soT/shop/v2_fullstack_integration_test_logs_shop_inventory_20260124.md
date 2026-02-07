문서 타입: 테스트 로그
버전: v1.0
작성일: 2026-01-24
작성자: GitHub Copilot
대상 독자: BE/FE/QA/운영

# V2 Full-Stack Integration Test Logs - Shop/Inventory (2026-01-24)

## 1. 목적 (Purpose)
Shop/Inventory 영역의 V2 라우팅/엔드포인트/DB 반영을 단일 로그로 기록한다.

## 2. 환경 (Environment)
- 날짜: 2026-01-24
- 타임존: KST
- 환경: local

## 3. 검증 범위 (Scope)
- Shop: GET /api/v2/shop/products, POST /api/v2/shop/purchase
- Inventory: POST /api/v2/inventory/use
- Admin Inventory Grant: POST /api/v2/admin/inventory/items (테스트용 아이템 지급)

## 4. 실행 결과 (Results)
| 항목 | 상태 | 증거 | 비고 |
|---|---|---|---|
| Dev Login | PASS ✅ | [docs/v2_specs/00_sot_meta/artifacts/20260124/api/dev_login_response_v2_shop_inventory.json](docs/v2_specs/00_sot_meta/artifacts/20260124/api/dev_login_response_v2_shop_inventory.json) | v2 토큰 발급 |
| Shop Products | PASS ✅ | [docs/v2_specs/00_sot_meta/artifacts/20260124/api/shop_products_response_v2.json](docs/v2_specs/00_sot_meta/artifacts/20260124/api/shop_products_response_v2.json) | 200 OK |
| Shop Purchase | PASS ✅ | [docs/v2_specs/00_sot_meta/artifacts/20260124/api/shop_purchase_response_v2.json](docs/v2_specs/00_sot_meta/artifacts/20260124/api/shop_purchase_response_v2.json) | idempotency 적용 |
| Admin Inventory Grant | PASS ✅ | [docs/v2_specs/00_sot_meta/artifacts/20260124/api/admin_inv_grant_response_v2_shop_inventory.json](docs/v2_specs/00_sot_meta/artifacts/20260124/api/admin_inv_grant_response_v2_shop_inventory.json) | VOUCHER_ROULETTE_COIN_1 지급 |
| Inventory Use | PASS ✅ | [docs/v2_specs/00_sot_meta/artifacts/20260124/api/inventory_use_response_v2.json](docs/v2_specs/00_sot_meta/artifacts/20260124/api/inventory_use_response_v2.json) | X-Idempotency-Key 사용 |

## 5. 변경 이력
- v1.0 (2026-01-24, GitHub Copilot): Shop/Inventory PASS 기록
