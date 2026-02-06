문서 타입: 테스트 로그 (Public)
버전: v1.1
작성일: 2026-01-24
작성자: GitHub Copilot
대상 독자: BE/FE/QA/운영

# V2 Full-Stack Integration Test Logs - Public (2026-01-24)

## 1. 목적 (Purpose)
상점, 미션, 인벤토리, 금고 등 일반 유저 지향 기능의 V2 전 구간 연동 상태를 기록한다.

## 2. 검증 항목
| 항목 | FE 진입점 | API 엔드포인트 | 상태 | 증거 |
|---|---|---|---|---|
| Mission List | /missions | GET /api/v2/mission/ | PASS ✅ | [docs/v2_specs/00_sot_meta/artifacts/20260124/api/mission_list_response_v2.json](docs/v2_specs/00_sot_meta/artifacts/20260124/api/mission_list_response_v2.json) |
| Shop Purchase | /shop | POST /api/v2/shop/purchase | PASS ✅ | [docs/v2_specs/00_sot_meta/artifacts/20260124/api/shop_purchase_response_v2.json](docs/v2_specs/00_sot_meta/artifacts/20260124/api/shop_purchase_response_v2.json) |
| Vault Withdraw | /vault | POST /api/v2/vault/withdraw | PASS ✅ | [docs/v2_specs/00_sot_meta/artifacts/20260124/api/vault_withdraw_response_v2.json](docs/v2_specs/00_sot_meta/artifacts/20260124/api/vault_withdraw_response_v2.json) |
| Inventory Use | /inventory | POST /api/v2/inventory/use | PASS ✅ | [docs/v2_specs/00_sot_meta/artifacts/20260124/api/inventory_use_response_v2.json](docs/v2_specs/00_sot_meta/artifacts/20260124/api/inventory_use_response_v2.json) |

## 3. 세부 로그
- Mission List: GET /api/v2/mission/
- Shop Purchase: POST /api/v2/shop/purchase
- Vault Withdraw: POST /api/v2/vault/withdraw
- Inventory Use: POST /api/v2/inventory/use

## 4. 변경 이력
- v1.1 (2026-01-24, GitHub Copilot): Public Area PASS 반영

---
(끝)
