문서 타입: SoT (정본)
버전: v2.1
최종 검토일: 2026-02-06
상태: Stable
도메인: shop
정합성 상태: 🟡 (제재 로직 코드 반영 확인 중)

## 0. SoT 정합성 지표
- **대상 테이블**: `v2_shop_order`, `ui_configs` (v2_shop_products)
- **코드 매핑**: `app/v2/services/shop_service.py`, `app/v2/api/routes.py`
- **정합성 요약**:
  - 🟢 상품 SKU 및 가격 정책 (UI Config 기반)
  - 🔴 제재 유저 구매 차단: `benefits_suspended` 체크 로직 누락 리스크 존재
  - 🟡 상점 공백 리스크: UI Config 부재 시 Fallback 로직 필요

---

## 1. 개요 (Overview)
유저가 포인트 또는 금고 재화를 사용하여 상품(티켓, 아이템 등)을 구매하는 시스템의 정본 사양을 정의한다.

## 2. 상품 및 가격 정책 (Product SoT)
모든 상품 정보는 `ui_configs` 테이블의 `v2_shop_products` 키에 JSON으로 관리된다.
- **주요 필드**: `sku`, `name`, `cost_type` (VAULT/POINT), `cost_amount`, `reward_type`.
- **기본 상품 예시**: `DEFAULT_TICKET` (1,000 Vault -> 1 Roulette Ticket).

## 3. 핵심 구매 정책 (Purchase Policy)
- **제재 유저 차단 (Strict Vault Policy)**:
  - `benefits_suspended=True` (7일 무입금) 유저의 구매를 반드시 차단해야 한다.
  - 차단 시 에러 코드: `HTTP 403 (BENEFITS_SUSPENDED_7D_NO_DEPOSIT)`
- **중복 구매 방지**: 동일 요청에 대해 `v2_shop_order` 테이블의 트랜잭션 무결성을 보장한다.

## 4. 운영 리스크 및 방어 (Risk Management)
- **상점 공백 리스크**: UI Config가 비어있을 경우 유저에게 빈 화면이 노출되지 않도록 서버단에서 Fallback(기본 상품 리스트)을 반환하고 Sentry 알람을 발생시킨다.
- **재고 무결성**: 포인트 차감과 아이템 지급(Inventory)은 원자적(Atomic)으로 처리되어야 한다.

---

## 5. 검증 체크리스트 (QA)
- [ ] 🔴 제재 대상 유저가 상점 API 호출 시 구매가 거부되는지 확인
- [ ] 🟡 `UiConfigService`에서 빈 값을 반환할 때 Sentry 알람이 정상 발송되는지 테스트
- [x] 🟢 구매 완료 후 `v2_spending_ledger`에 `SHOP_U` 타입으로 자동 기록되는지 확인

---

## 6. 변경 이력
- v2.1 (2026-02-06, Antigravity): 수동 정리 요청에 따라 누락된 제재 유저 차단 정책 및 상점 공백 리스크 대응 방안 복원 통합.
- v1.0 (2026-01-19, GitHub Copilot): 초기 spec 작성
