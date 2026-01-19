# V1 레거시 API 대비 V2 구현 갭 리포트

**검증 일시**: 2026-01-19
**기준**:
- V1 레거시 API: `docs/v2_specs/03_api/v1_legacy_api_list_ko.md`
- V2 구현: `app/v2/api/routes.py`, `app/v2/services/*`, `app/v2/schemas/*`, `app/v2/models/*`
- V2 SoT/계약: `docs/v2_specs/` (03_api 중심)

---

## 1. 요약 (Summary)
현재 V2에서 **게임/세그먼트/메시지/Golden + 미션/스트릭 + 상점/인벤토리 + 팀배틀 + Ticket Zero + Admin/Ops 실행결과 + System/Ops**까지 라우트가 구현되었습니다.
V1 레거시 API 대비 **Auth/User 영역이 미구현**이며, 해당 영역은 **추가 V2 라우트 및 연동 정리가 필요**합니다.

---

## 2. V2 구현 완료/부분 구현 영역

### 2.1 게임 (Roulette/Dice/Lottery)
- V2 라우트: ✅ (`/api/v2/roulette|dice|lottery`)
- 서비스: ✅ (V1 서비스 재사용)
- API SoT: ✅ [v2_game_api_contract_ko.md](../03_api/v2_game_api_contract_ko.md)

### 2.2 세그먼트/메시지
- V2 라우트: ✅ (`/api/v2/segments/run`, `/api/v2/messages`)
- 서비스/DB: ✅
- API SoT: ✅ (API 계약 문서 추가됨)

### 2.3 Golden (리텐션 개입)
- V2 라우트: ✅ (`/api/v2/golden/intervention/resolve`, `/api/v2/golden/reengagement/queue`)
- 서비스: ✅ (V1 Retention 서비스 재사용)
- API SoT: ✅ [v2_golden_api_contract_ko.md](../07_golden/v2_golden_api_contract_ko.md)

### 2.4 Mission & Streak
- V2 라우트: ✅ (`/api/v2/mission/*`)
- 서비스: ✅ (V1 서비스 래핑)
- API SoT: ✅ [v2_mission_streak_api_contract_ko.md](../03_api/v2_mission_streak_api_contract_ko.md)

### 2.5 Inventory & Shop
- V2 라우트: ✅ (`/api/v2/inventory`, `/api/v2/inventory/use`, `/api/v2/shop/products`, `/api/v2/shop/purchase`)
- 서비스: ✅ (V1 서비스/정책 래핑)
- API SoT: ✅ [v2_inventory_shop_api_contract_ko.md](../03_api/v2_inventory_shop_api_contract_ko.md)

### 2.6 Team Battle
- V2 라우트: ✅ (`/api/v2/team-battle/*`)
- 서비스: ✅ (V1 서비스 래핑)
- API SoT: ✅ [v2_team_battle_api_contract_ko.md](../03_api/v2_team_battle_api_contract_ko.md)

### 2.7 Ticket Zero (긴급 구호)
- V2 라우트: ✅ (`/api/v2/ticket-zero/status`, `/api/v2/ticket-zero/bailout`)
- 서비스/DB: ✅
- API SoT: ✅ [v2_ticket_zero_api_contract_ko.md](../03_api/v2_ticket_zero_api_contract_ko.md)

### 2.8 Admin/Ops (실행 결과)
- V2 라우트: ✅ (`/admin/api/ops/tasks/{task_id}/execution-result`)
- 서비스/DB: ✅
- API SoT: ✅ [v2_admin_ops_api_contract_ko.md](../03_api/v2_admin_ops_api_contract_ko.md)

---

## 3. V1 대비 V2 API 누락 영역 (라우트 기준)

> 아래 항목은 **V2 라우트가 부재**하거나 **V2 SoT/API 계약이 없어서 진행 불가**한 영역입니다.

### 3.1 Auth & User
- V1: `/api/auth/token`, `/api/activity/record`, `/api/telegram/*`, `/api/new-user/*`
- V2: ❌ 운영 라우트 없음 (dev 전용 `/api/v2/dev/login`만 존재, 운영 비활성)
- SoT: ✅ V2 Auth/User API 계약 문서 있음 (라우트 미구현)

### 3.2 System/Ops
- V1: `/api/health`, `/api/today-feature`, `/metrics`
- V2: ✅ 전용 라우트 추가 (`/api/v2/health`, `/api/v2/today-feature`, `/api/v2/metrics`)
- SoT: ✅ V2 System/Ops SoT 기준 문서 추가 (V1 폐기 예정)

---

## 4. SoT/로직 미생성 항목 요약

### 4.1 SoT(=V2 API 계약 문서) 미생성
- 없음 (핵심 도메인 API 계약 문서 생성 완료)

### 4.2 로직/라우트 미구현
- Auth/User V2 라우트

---

## 4.3 V2 System/Ops SoT 준수 체크
기준 문서: `docs/v2_specs/05_ops/v2_system_ops_sot_ko.md`

- `/api/v2/health`: ✅ `{"status":"ok"}`
- `/api/v2/today-feature`: ✅ `feature_type` 반환, 인증 시 `user_id` 포함
- `/api/v2/metrics`: ✅ Prometheus 포맷 응답

---

## 5. 권장 진행 순서 (Phase 10 기준)
1) **V2 FE API Client 생성** (게임/골든/세그먼트/메시지부터)
2) **Auth/User V2 라우트 구현** (API 계약 기준)
3) **System/Ops 전용 라우트 정리** (운영/모니터링 범위 확정)

---

## 6. 변경 이력
- v1.4 (2026-01-19, GitHub Copilot): V2 System/Ops SoT 문서 추가 및 준수 체크 반영
- v1.3 (2026-01-19, GitHub Copilot): System/Ops V2 라우트 추가 반영 및 V1 폐기 계획 반영
- v1.2 (2026-01-19, GitHub Copilot): Auth/User 미구현 상태 구체화(dev 전용 로그인만 존재) 및 System/Ops V1 유지 명시
- v1.1 (2026-01-19, GitHub Copilot): V2 라우트/계약 구현 반영 및 미구현 영역 갱신
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
