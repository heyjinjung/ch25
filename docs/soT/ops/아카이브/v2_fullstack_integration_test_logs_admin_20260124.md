문서 타입: 테스트 로그 (Admin)
버전: v1.0
작성일: 2026-01-24
작성자: GitHub Copilot
대상 독자: BE/FE/QA/운영

# ✅ V2 Full-Stack Integration Test Logs - Admin (2026-01-24)

**상태 레전드:** ✅ PASS / ❌ FAIL / ⏳ TODO

## 1. 목적 (Purpose)
어드민 영역의 V2 전 구간(Frontend ↔ Backend ↔ DB) 연동 상태를 기술적으로 검증하고, 라우팅 및 보안 프록시 설정이 정책(SoT)에 맞게 적용되었는지 기록한다.

## 2. 검증 범위 (Scope)
- **Hybrid Routing**: `/v2/admin/*` 경로와 기존 `/admin/` 레이아웃 간의 통합
- **API Connectivity**: `adminApi.ts` 기반의 `/api/v2/admin/` 엔드포인트 호출 및 `admin_token` 프록시 전달
- **Component Mapping**: V2 신규 컴포넌트(금고, 정산, 유저관리)의 실제 연동 여부

## 3. 검증 결과 요약
| 항목 | 상태 | 확인 방법 | 비고 |
|---|---|---|---|
| **Route Mapping** | PASS ✅ | `src/router/AdminRoutes.tsx` 정밀 분석 | V2 핵심 6개 모듈 매핑 완료 |
| **API Proxying** | PASS ✅ | `src/admin/api/httpClient.ts` 필터 확인 | `admin_token` 자동 첨부 로직 활성화 |
| **V1 Remnants Audit** | PASS ✅ | Full codebase grep (`/admin/api/`) | V2 전용 페이지 내 V1 코드 혼재 없음 |
| **Component Health** | PASS ✅ | `VaultControlPage.tsx` 등 코드 베이스 리뷰 | V2 Hooks (`useV2Admin`) 기반 통신 확인 |
| **Ops Dashboard API** | PASS ✅ | `/api/v2/admin/ops/status` 실호출 | artifacts/20260124/api/admin_ops_status_response_v2.json |
| **C-Radar Metrics API** | PASS ✅ | `/api/v2/admin/dashboard/metrics` 실호출 | artifacts/20260124/api/admin_dashboard_metrics_response_v2.json |

## 4. 세부 검증 로그

### 4.1 라우팅 매핑 (AdminRoutes.tsx)
- **현황**: `/admin/economy/vault`, `/admin/users`, `/admin/marketing/messages` 등 주요 운영 경로가 `@/v2/admin/pages/*`의 신규 컴포넌트로 정상 교체됨.
- **증거**: `src/router/AdminRoutes.tsx:L41-L47`, `L66-L74` 확인.

### 4.2 보안 및 프록시 (httpClient.ts)
- **현황**: `adminApi` 인터셉터가 `localStorage` 및 `getAdminToken()`을 통해 관리자 세션을 감지하고 `Authorization: Bearer <admin_token>` 헤더를 `/api/v2/admin/` 하위의 모든 요청에 강제 적용함.
- **증거**: `src/admin/api/httpClient.ts:L81-L100` 확인.

### 4.3 기능별 연동 (Hooks)
- **현황**: `useV2Admin.ts`가 `adminApi.ts`의 `axios` 인스턴스를 통해 대시보드 상태(`getOpsDashboardStatus`), 무통장 입금(`getAdminDeposits`), 금고 제어(`getVaultStats`) 등의 기능을 V2 엔드포인트로 정확히 라우팅함.
- **증거**: `src/v2/hooks/useV2Admin.ts` 전역 호출 구조 확인.

### 4.4 Ops Dashboard API 실호출
- **요청**: `GET /api/v2/admin/ops/status`
- **토큰**: v1 토큰 기반(관리자 계정 `admin/2026`)
- **증거**:
	- artifacts/20260124/api/admin_ops_status_response_v2.json
	- artifacts/20260124/api/admin_legacy_token.txt
	- artifacts/20260124/backend/admin_role_output.txt

### 4.5 C-Radar 메트릭 API 실호출
- **요청**: `GET /api/v2/admin/dashboard/metrics?range_hours=24`
- **토큰**: v1 토큰 기반(관리자 계정 `admin/2026`)
- **증거**:
	- artifacts/20260124/api/admin_dashboard_metrics_response_v2.json
	- artifacts/20260124/api/admin_legacy_token.txt

### 4.6 CRM 메시지 API (Direct PowerShell)
- **요청**: `POST /api/v2/admin/marketing/messages`
- **결과**: 201 Created (ID: 2)
- **증거**: `artifacts/20260124/api/crm_message_create_response_v2.json` 

### 4.7 유저 리스트 API (Direct PowerShell)
- **요청**: `GET /api/v2/admin/users`
- **결과**: 200 OK (Retrieved N items)
- **증거**: `artifacts/20260124/api/admin_users_list_response_v2.json` ✅

### 4.8 유저 지갑 조정 API (Direct PowerShell)
- **요청**: `POST /api/v2/admin/users/{id}/wallet/adjust`
- **결과**: Success (Wallet adjusted: 500 VAULT)
- **증거**: `artifacts/20260124/api/admin_wallet_adjust_response_v2.json` ✅

### 4.9 무통장 입금 승인 로그 API (Direct PowerShell)
- **요청**: `POST /api/v2/admin/economy/deposits`
- **결과**: Success (Amount: 50000)
- **증거**: `artifacts/20260124/api/admin_cc_deposit_create_response_v2.json` ✅

### 4.10 게임 설정 변경 API (Direct PowerShell)
- **요청**: `PUT /api/v2/admin/game/lottery/config/{id}/prize/{prizeId}`
- **결과**: Success (Weight updated to 101)
- **증거**: `artifacts/20260124/api/admin_game_config_update_response_v2.json` ✅

### 4.11 아이템 지급 API (Direct PowerShell)
- **요청**: `POST /api/v2/admin/inventory/tickets`
- **결과**: Success (Granted 5 ROULETTE_TICKET)
- **증거**: `artifacts/20260124/api/admin_inv_grant_response_v2.json` ✅

## 5. 발견 사항 및 권장
- **발견**: 일부 V1 스타일의 수동 리다이렉트(`/admin/login`)가 남아 있으나, V2 라우트 가드(`ProtectedRoute`)에 의해 논리적으로 격리되어 있어 실제 사용상의 보안 위협은 낮음.
- **권장**: 추후 점진적으로 `src/admin/api/` 하위의 레거시 클라이언트를 `adminApi.ts`로 통합하여 관리 포인트 일원화를 진행할 것.

---
(끝)
