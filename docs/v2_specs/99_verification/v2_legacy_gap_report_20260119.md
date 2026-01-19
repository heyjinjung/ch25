# V1 레거시 API 대비 V2 구현 갭 리포트

**검증 일시**: 2026-01-19
**기준**:
- V1 레거시 API: `docs/v2_specs/03_api/v1_legacy_api_list_ko.md`
- V2 구현: `app/v2/api/routes.py`, `app/v2/services/*`, `app/v2/schemas/*`, `app/v2/models/*`
- V2 SoT/계약: `docs/v2_specs/` (03_api 중심)

---

## 1. 요약 (Summary)
현재 V2에서 **실제 라우트가 구현된 영역은 게임/세그먼트/메시지/Golden**에 한정됩니다.
V1 레거시 API 대비 **다수 도메인의 V2 API 라우트가 부재**하며, 해당 영역은 **API 계약 SoT도 미정**입니다.

---

## 2. V2 구현 완료/부분 구현 영역

### 2.1 게임 (Roulette/Dice/Lottery)
- V2 라우트: ✅ (`/api/v2/roulette|dice|lottery`)
- 서비스: ✅ (V1 서비스 재사용)
- API SoT: ✅ [v2_game_api_contract_ko.md](../03_api/v2_game_api_contract_ko.md)

### 2.2 세그먼트/메시지
- V2 라우트: ✅ (`/api/v2/segments/run`, `/api/v2/messages`)
- 서비스/DB: ✅
- API SoT: ⚠️ (정책 SoT는 있으나 API 계약 문서 없음)

### 2.3 Golden (리텐션 개입)
- V2 라우트: ✅ (`/api/v2/golden/intervention/resolve`, `/api/v2/golden/reengagement/queue`)
- 서비스: ✅ (V1 Retention 서비스 재사용)
- API SoT: ✅ [v2_golden_api_contract_ko.md](../07_golden/v2_golden_api_contract_ko.md)

---

## 3. V1 대비 V2 API 누락 영역 (라우트 기준)

> 아래 항목은 **V2 라우트가 부재**하거나 **V2 SoT/API 계약이 없어서 진행 불가**한 영역입니다.

### 3.1 Auth & User
- V1: `/api/auth/token`, `/api/activity/record`, `/api/telegram/*`, `/api/new-user/*`
- V2: ❌ 라우트 없음
- SoT: ⚠️ V2 Auth/User API 계약 문서 없음

### 3.2 Mission & Streak
- V1: `/api/mission/*`, `/api/mission/streak/*`
- V2: ❌ 라우트 없음
- SoT: ⚠️ 정책 문서는 있으나 API 계약 문서 없음

### 3.3 Inventory & Shop
- V1: `/api/inventory`, `/api/inventory/use`, `/api/shop/products`, `/api/shop/purchase`
- V2: ❌ 라우트 없음
- SoT: ✅ 정책/스키마 문서 존재
- Gap: API 계약/라우트 미구현

### 3.4 Team Battle
- V1: `/api/team-battle/*`
- V2: ❌ 라우트 없음
- SoT: ✅ 정책 문서 존재
- Gap: API 계약/라우트 미구현

### 3.5 Ticket Zero (긴급 구호)
- V1: `/api/retention/bailout`
- V2: ❌ 라우트 없음
- SoT: ✅ [v2_ticket_zero_api_contract_ko.md](../03_api/v2_ticket_zero_api_contract_ko.md)
- Gap: 라우트/서비스 연결 미구현

### 3.6 System/Ops
- V1: `/api/health`, `/api/today-feature`, `/metrics`
- V2: ❌ 전용 라우트 없음 (V1 유지 가능)
- SoT: ⚠️ V2 Ops API 계약 문서 없음

---

## 4. SoT/로직 미생성 항목 요약

### 4.1 SoT(=V2 API 계약 문서) 미생성
- Auth/User
- Mission/Streak
- Inventory/Shop
- Team Battle
- Admin/Ops (실행 결과/대시보드 API)

### 4.2 로직/라우트 미구현
- Auth/User V2 라우트
- Mission/Streak V2 라우트
- Inventory/Shop V2 라우트
- Team Battle V2 라우트
- Ticket Zero V2 라우트 (스키마/서비스 존재하나 라우트 부재)

---

## 5. 권장 진행 순서 (Phase 10 기준)
1) **V2 FE API Client 생성** (게임/골든/세그먼트/메시지부터)
2) **Ticket Zero V2 라우트 구현** (API 계약 이미 존재)
3) **Inventory/Shop → Mission → Team Battle** 순으로 API 계약/라우트 작성

---

## 6. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
