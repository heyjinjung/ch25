문서 타입: 통합 현황
버전: v2.5 (2026-01-28)
작성일: 2026-01-28
작성자: Antigravity (Senior Fullstack Architect)
대상: 전체 팀
상태: SoT (Full Restoration & V2 Expansion)

# 🎯 골든 프로젝트 통합 현황 (Golden Project Status v2)

## 1. 개요 (Overview)

골든 프로젝트는 **"유저를 다시 오게 만들기 위한 실행 + 기록 + 검증"**을 하나로 묶은 운영 시스템입니다.
V2 단계에서는 기존 시스템의 안정성을 유지하면서 **'반자동 운영'**과 **'심리적 케어'** 레이어를 확장합니다.

### 1.1 핵심 3요소 (Core Pillars)
| 요소 | 설명 | 구현 상태 |
|------|------|----------|
| **개입(Intervention)** | 유저 상태를 보고 적절한 타이밍에 도와주는 행동 | ✅ 구현 완료 |
| **관제(Operations)** | 운영자가 한 일을 모두 기록하고 문제 시 빠르게 찾기 | ✅ 구현 완료 |
| **증거 수집(Evidence)** | 진짜 효과가 있었는지 데이터를 모아 증명 | ⚠️ 부분 구현 |

<!-- V2 Expansion: 1단계 [증거 센터] 설계를 통해 '증거 수집' 영역을 ROI 시각화 레벨로 강화 예정 -->

---

## 2. 구현 완료 항목 (Implemented Features - Preservation)

### 2.1 텔레그램 미니앱 (TMA)

| 파일 | 설명 |
|------|------|
| `app/bot/main.py` | 텔레그램 봇 메인 (Webhook/Polling 지원) |

**기능:**
- `/start` 명령어 → 미니앱 버튼 제공
- WebAppInfo로 기존 React UI 임베드
- 환경변수: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_MINI_APP_URL`

**설정 (app/core/config.py):**
```python
telegram_bot_token: str | None
telegram_bot_username: str | None
telegram_mini_app_url: str
telegram_channel_username: str | None
telegram_use_webhook: bool
telegram_webhook_url: str | None
telegram_webhook_port: int
telegram_webhook_secret_token: str | None
```

---

### 2.2 골든 인터벤션 시스템

| 파일 | 설명 |
|------|------|
| `app/v2/services/golden_intervention_service.py` | 트리거 감지 및 액션 실행 |
| `app/v2/services/golden_event_service.py` | 이벤트 발행 서비스 |
| `app/v2/workers/golden_event_worker.py` | ch25_events → golden:v2 채널 브릿지 |
| `app/v2/workers/golden_intervention_worker.py` | 개입 이벤트 발행 워커 |

**구현된 트리거:**
| 트리거 ID | 조건 | 액션 | 쿨다운 |
|-----------|------|------|--------|
| `TRG_LOSE_5` | 연속 5패 | Pity Win 트리거 | 1시간 |
| `TRG_BALANCE_DROP` | 잔액 50% 하락 | 보너스 제공 | 1시간 |

**Redis Pub/Sub 채널:**
```
ch25_events              # 원본 게임 이벤트
golden:v2:events:game    # V2 게임 이벤트
golden:v2:events:intervention  # 개입 이벤트
golden:v2:cooldown:*     # 쿨다운 키
golden:v2:user:*:psych_state  # 유저 심리 상태
golden:v2:user:*:session_start_balance  # 세션 시작 잔액
```

<!-- V2 Update Notes (Section 2.2):
- V2 2단계 [반자동 CRM] 도입 시, golden_intervention_service의 즉시 실행 로직은 PENDING_APPROVAL 상태로 로그를 생성하는 방식으로 확장됩니다.
- 기존 자동 발송 로직은 서킷 브레이커 또는 관리자 모드에 따라 선택적용 가능하도록 구성합니다.
-->

---

### 2.3 데이터베이스 모델

| 테이블 | 파일 | 용도 |
|--------|------|------|
| `v2_golden_intervention_log` | `app/v2/models/v2_golden_intervention_log.py` | 개입 로그 (감사 추적) |
| `v2_user_retention_state` | `app/v2/models/v2_user_retention_state.py` | 유저 리텐션 상태 |
| `v2_retention_roi_log` | `app/v2/models/v2_retention_roi_log.py` | 리텐션 ROI 로그 |

**v2_golden_intervention_log 스키마:**
```sql
id                    INT PRIMARY KEY
user_id               INT FK(v2_user.id)
trigger_id            VARCHAR(50)  -- TRG_LOSE_5, TRG_ZERO_BAL
trigger_condition     TEXT
action_taken          VARCHAR(100)
user_balance_before   FLOAT
session_balance_delta FLOAT
recent_results        VARCHAR(50)  -- "LOSE,LOSE,LOSE,LOSE,LOSE"
cooldown_expires_at   DATETIME
created_at            DATETIME
```

<!-- V2 Update Notes (Section 2.3):
- v2_golden_intervention_log에 `status` (PENDING, APPROVED, REJECTED, SENT) 필드가 추가될 예정입니다.
- v2_user_retention_state에 `pending_deposit_proof` (지연 대응용) 필드가 확장될 예정입니다.
-->

---

### 2.4 관제 대시보드 (Admin Frontend)

#### 2.4.1 페이지 구조

| 파일 | 경로 | 설명 |
|------|------|------|
| `GoldenRealTimePage.tsx` | `src/v2/admin/pages/dashboard/` | 실시간 모니터링 메인 페이지 |
| `OpsDashboard.tsx` | `src/v2/admin/pages/dashboard/` | Ops 대시보드 (Golden Radar 포함) |
| `CrisisRadarPage.tsx` | `src/v2/admin/pages/dashboard/` | 이상 탐지 페이지 |
| `AdminGoldenHourPage` | `src/v2/admin/pages/placeholders.tsx` | 골든아워 관리 (Pending) |

#### 2.4.2 컴포넌트

| 파일 | 경로 | 기능 |
|------|------|------|
| `GoldenEventStream.tsx` | `src/v2/admin/components/golden/` | WebSocket 실시간 이벤트 스트림 |
| `InterventionLogTable.tsx` | `src/v2/admin/components/golden/` | 개입 로그 테이블 (트리거별 색상 뱃지) |

#### 2.4.3 라우팅 (V2AdminRoutes.tsx)

```
/admin/dashboard           → OpsDashboard (기본 대시보드)
/admin/dashboard/golden    → GoldenRealTimePage (골든 레이더)
/admin/dashboard/radar     → CrisisRadarPage (이상 탐지)
/admin/game/golden-hour    → AdminGoldenHourPage (골든아워 관리)
/admin/game/modals         → ModalControlPage (모달 제어)
```

<!-- V2 Update Notes (Section 2.4):
- /admin/marketing/center (MarketingCenterPage)가 V2의 메인 증거 센터 및 승인 UI로 신설/확장됩니다.
- 기존 대시보드들은 유지하며, 분석 데이터만 V2 증거 센터로 통합 및 링크 처리합니다.
-->

---

### 2.5 프론트엔드 API 연동

#### 2.5.1 API 클라이언트 (goldenApi.ts)

| 함수 | 엔드포인트 | 설명 |
|------|-----------|------|
| `resolveV2Intervention` | `POST /api/golden/intervention/resolve` | 인터벤션 해결 요청 |
| `queueV2Reengagement` | `POST /api/golden/reengagement/queue` | 재참여 큐 등록 |

**타입 정의:**
```typescript
interface RetentionInterventionRequest {
  event_type: string;
  data?: Record<string, unknown>;
}

interface RetentionInterventionResponse {
  eligible: boolean;
  experiment_group?: string;
  reward_type?: string;
  reward_amount?: number;
  capped_amount?: number;
  cmax?: number;
  predicted_ltv?: number;
  roi_percent?: number;
  message?: string;
}
```

#### 2.5.2 React Query Hooks (useV2Admin.ts)

| Hook | 용도 | 자동 새로고침 |
|------|------|--------------|
| `useInterventionLogs(userId, limit)` | 유저별 인터벤션 로그 조회 | 10초 |

#### 2.5.3 WebSocket 연결 (GoldenEventStream.tsx)

```typescript
// 연결 엔드포인트
const wsEndpoint = `${wsUrl}/api/v2/admin/ws/golden/events`;

// 메시지 타입
{ type: "connection" }     // 연결 성공
{ type: "event", data }    // 게임 이벤트
{ type: "error", message } // 오류

// GameEvent 구조
interface GameEvent {
  eventId: string;
  userId: number;
  timestamp: string;
  gameType: string;
  result: string;
  betAmount: number;
  payoutAmount: number;
  currentBalance: number;
  source: string;
  sessionId?: string;
}
```

---

### 2.6 Ops Plan 및 메시징 시스템

| 파일 | 설명 |
|------|------|
| `app/v2/api/admin_ops_plan.py` | Ops Plan 관리 API |
| `app/v2/services/v2_admin_ops_plan_service.py` | Ops Plan 서비스 |
| `app/models/ops_plan.py` | OpsCampaign, OpsPlan 모델 |
| `app/api/routes/crm_inbox.py` | CRM 인박스 API |
| `app/v2/models/v2_admin_message.py` | V2 메시지 모델 |

---

## 3. [추가] V2 전략적 확장 모듈 (Strategic Expansion)

기본 아키텍처를 유지하며 리텐션 극대화를 위해 새롭게 추가되는 핵심 모듈입니다.

### 3.1 V2 4대 확장 모듈 개요
- **[1단계: 증거 센터]**: ROI 및 데이터 실효성 증명 (Evidence over Guesswork)
- **[2단계: 반자동 CRM]**: AI 추출 + 관리자 최종 승인 루프 (Human-in-the-loop)
- **[3단계: 유연한 케어]**: 한정판 뱃지, 코호트 방어(CPR), 스트릭 복구 (Care over Control)
- **[4단계: 지연 대응]**: 유저 증거 제출(TX ID) 및 선지급 후검증 (Survival over Latency)

---

## 4. 테스트 및 안전장치

### 4.1 테스트 커버리지 (기존)
- `test_cc_deposit_logic.py`, `test_ch25_event_publish.py`, `test_golden_intervention_service.py` 통과 완료.

### 4.2 미구현/우선순위 (V2 통합)
| 항목 | 설명 | 상태 |
|------|------|------|
| **데일리 넛지** | 스케줄 기반 무료 토큰 정보 발송 | 🔴 High |
| **Circuit Breaker** | 과다 지급 방지 (코호트 방어로 확장) | 🔴 High |
| **A/B 테스트** | 개입 효과 측정용 분리 테스트 | 🟢 Low |

---

## 5. 통합 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────────┐
│                  골든 V2 확장 아키텍처 (Integrated)             │
├──────────────────────────────────────────────────────────────┤
│  [기존 엔진]                                                  │
│  유저 액션 -> Redis(Events) -> Intervention Worker           │
│                                 │                            │
│  [V2 확장 레이어]                ▼                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 1. [Pending Queue] : AI 추천 대상 적재 (crm_routes)      │  │
│  │ 2. [Approval Center] : 운영자 검토 및 최종 승인          │  │
│  │ 3. [User Proof] : 데이터 지연 시 유저 증거 수신 (TX ID)  │  │
│  └──────────────────────────────┬─────────────────────────┘  │
│                                 ▼                            │
│  [실행 및 검증]                                               │
│  TMA 발송 / 보상 지급 / ROI 증거 센터 (Evidence Center)         │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. 로드맵 (Roadmap)
1. **Phase A**: 반자동 CRM 엔진 및 지연 대응 (생존 및 신뢰 확보)
2. **Phase B**: 유연한 케어 및 자동 코호트 방어 (심리적 자산화)
3. **Phase C**: 통합 증거 센터 및 기술적 마찰 감사 (ROI 증명 및 최적화)

---

## 7. 변경 이력
- v2.5 (2026-01-28): Admin WebSocket 경로를 /api/v2 기준으로 정합화.
- v2.4 (2026-01-28): 사용자 요청에 의거 기존 구현 상세(v2.0) 100% 복구 및 V2 확장 계획 주석 통합.
- v2.0 (2026-01-26): 최초 통합 현황 작성.
