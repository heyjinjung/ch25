# Golden V2 Feature & Routing Mapping (최신본)

이 문서는 현재 Golden V2 시스템에 구현된 핵심 기능들과 이를 지원하는 백엔드 로직, API 엔드포인트, 그리고 관리자 UI(Frontend) 간의 연동 맵핑 정보를 요약합니다.

## 1. 운영 핵심 기능 매핑 테이블

| 기능 카테고리 | 핵심 기능 | 백엔드 서비스 (Python) | API 엔드포인트 (BE) | 프론트엔드 라우팅 (FE) |
| :--- | :--- | :--- | :--- | :--- |
| **인터벤션 & 케어** | **Daily Nudge** | `DailyNudgeService` | `/api/v2/admin/daily-nudge/*` | `/admin/marketing/messages` |
| **지연 극복** | **Latency Survival** | `LatencySurvivalService` | `/api/v2/admin/economy/latency-evidences` | `/admin/economy/latency` |
| **시스템 안전** | **Circuit Breaker** | `CircuitBreakerService` | `/api/v2/admin/economy/circuit-breaker/*` | `/admin/economy/circuit-breaker` |
| **인프라/인증** | **Native Auth** | `TelegramAuthService` | `/api/v2/telegram/auth` | `/admin/login` (Auth 기반) |
| **경제 시스템** | **Vault Control** | `VaultService`, `AdminEconomyService` | `/api/v2/admin/vault/*` | `/admin/economy/vault` |
| **자산 관리** | **Deposit Sync** | `AdminCCDepositService` | `/api/v2/admin/economy/deposits` | `/admin/economy/deposits` |
| **운영 설정** | **Shop & Mission** | `UiConfigService`, `MissionService` | `/api/v2/admin/economy/shop/*` | `/admin/economy/shop` |
| **복구 정책** | **Rollback Policy** | `V2AdminOpsService` | `/api/v2/admin/ops/rollback/*` | `/admin/ops/logs` (Rollback) |
| **비용 분석** | **ROI Calculator** | `V2RetentionRoiService` | `/api/v2/admin/ops/roi/*` | `/admin/dashboard` (ROI) |

---

## 2. 상세 연동 명세

### 2.1 Latency Survival (지연 극복)
- **목적**: 4~12시간의 입금 확인 지연 시간을 유저 측 증거 제출(TX ID) 및 선지급-후검증 방식으로 극복.
- **Backend Service**: `LatencySurvivalService.submit_evidence`, `verify_evidence`
- **Frontend Page**: `LatencySurvivalPage.tsx`
- **API Mapping**:
    - `GET /api/v2/admin/economy/latency-evidences`: 증거 목록 조회
    - `POST /api/v2/admin/economy/latency-evidences/{id}/verify`: 증거 수동 매칭/승인
    - `POST /api/v2/admin/economy/latency-evidences/{id}/reject`: 증거 반려 및 회수(Clawback)

### 2.2 Circuit Breaker (지급 안전장치)
- **목적**: 전역 또는 개별 유저의 비정상적인 자산(VAULT, TICKET) 지급 폭증 시 시스템을 차단하여 경제 붕괴 방지.
- **Backend Service**: `CircuitBreakerService.check_limit`, `reset_global_limit`
- **Frontend Page**: `CircuitBreakerPage.tsx`
- **API Mapping**:
    - `GET /api/v2/admin/economy/circuit-breaker/status`: 실시간 한도 소진율 및 차단 상태 조회
    - `POST /api/v2/admin/economy/circuit-breaker/reset`: 글로벌/유저 리셋 액션 (Slide-to-Approve 적용)
    - `PUT /api/v2/admin/economy/circuit-breaker/limits`: 임계치(Threshold) 설정 변경

### 2.3 Daily Nudge (리텐션 스케줄러)
- **목적**: 유저별 활동 사이클에 맞춘 맞춤형 푸시/메시지 및 자산 보상을 통한 리텐션 강화.
- **Backend Service**: `DailyNudgeService.process_nudge_queue` (Celery Batch)
- **API Mapping**:
    - `GET /api/v2/admin/daily-nudge/configs`: 넛지 정책 목록 조회
    - `POST /api/v2/admin/daily-nudge/run`: 특정 넛지 즉시 실행(테스트용)

---

### 2.4 Rollback Policy (개입 회수)
- **목적**: 오발송된 보상이나 개입 액션을 안전하게 회수하여 경제 밸런스 유지.
- **Backend Service**: `V2AdminOpsService.rollback_execution`
- **API Mapping**:
    - `POST /api/v2/admin/ops/rollback/{execution_id}`: 특정 실행 건 전체 회수
    - `POST /api/v2/admin/ops/rollback/user`: 특정 유저의 개별 지급 건 회수

### 2.5 ROI Calculator (투자 효과 분석)
- **목적**: 개입 비용 대비 유저의 추가 입금 및 게임 활동을 분석하여 운영 효율성 측정.
- **Backend Service**: `V2RetentionRoiService.calculate_roi`
- **API Mapping**:
    - `GET /api/v2/admin/ops/roi/summary`: 글로벌 ROI 요약
    - `GET /api/v2/admin/ops/roi/campaign/{id}`: 캠페인별 상세 분석

---

## 3. 라우팅 구조 (SoT)

### 3.1 Backend Router Structure
- **Root**: `app/v2/api/admin/__init__.py` (Prefix: `/api/v2/admin`)
- **Sub-routers**:
    - `economy_router`: `/economy` (Vault, Deposit, Latency, Circuit Breaker)
    - `daily_nudge_router`: `/daily-nudge`
    - `ops_router`: `/ops` (Dashboard, Radar)

### 3.2 Frontend Router Structure
- **Root**: `src/v2/router/V2AdminRoutes.tsx`
- **Layout**: `AdminLayout.tsx` (Sidebar Navigation 연동)
- **Main Path**:
    - `/admin/economy/latency`: 지연 극복 관제
    - `/admin/economy/circuit-breaker`: 서킷 브레이커 설정
    - `/admin/economy/vault`: 금고 현황

---

## 4. 유의사항
- 모든 V2 관리자 기능은 `get_current_admin_info` 의존성을 통해 **Admin 권한 체크**를 수행합니다.
- 특히 `Circuit Breaker Reset` 및 `Latency Evidence Verify`와 같은 쓰기 액션은 **V2AdminAuditService**를 통해 감사 로그(Audit Log)로 기록됩니다.
- 본 문서는 시스템 구현 현황에 따라 주기적으로 업데이트되어야 합니다.
