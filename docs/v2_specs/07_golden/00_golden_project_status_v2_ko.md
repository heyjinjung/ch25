문서 타입: 통합 현황
버전: v2.0
작성일: 2026-01-26
작성자: GitHub Copilot
대상: 전체 팀
상태: SoT

# 🎯 골든 프로젝트 통합 현황 (Golden Project Status v2)

## 1. 개요 (Overview)

골든 프로젝트는 **"유저를 다시 오게 만들기 위한 실행 + 기록 + 검증"**을 하나로 묶은 운영 시스템입니다.

### 1.1 핵심 3요소
| 요소 | 설명 | 구현 상태 |
|------|------|----------|
| **개입(Intervention)** | 유저 상태를 보고 적절한 타이밍에 도와주는 행동 | ✅ 구현 완료 |
| **관제(Operations)** | 운영자가 한 일을 모두 기록하고 문제 시 빠르게 찾기 | ✅ 구현 완료 |
| **증거 수집(Evidence)** | 진짜 효과가 있었는지 데이터를 모아 증명 | ⚠️ 부분 구현 |

---

## 2. 구현 완료 항목

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

#### 2.4.4 사이드바 네비게이션 (AdminLayout.tsx)

```
운영(OPS)
├── 대시보드
│   ├── Ops 대시보드        /admin/dashboard
│   ├── Golden 레이더       /admin/dashboard/golden
│   └── 이상 탐지           /admin/dashboard/radar
└── 메시지 관리             /admin/marketing/messages

게임 관리(GAME)
├── 룰렛                    /admin/game/roulette
├── 주사위                  /admin/game/dice
├── 복권                    /admin/game/lottery
├── 팀 배틀                 /admin/game/team-battle
└── 이벤트/캠페인(골든아워)
    ├── 골든아워 관리       /admin/game/golden-hour
    └── 모달 제어           /admin/game/modals
```

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
const wsEndpoint = `${wsUrl}/api/admin/ws/golden/events`;

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

**기능:**
- 자동 재연결 (3초 간격)
- 최근 100개 이벤트 유지
- 연결 상태 실시간 표시

#### 2.5.4 골든아워 상태 (vaultApi.ts / gameApi.ts)

```typescript
interface VaultStatus {
  is_golden_hour_active: boolean;
  golden_hour_multiplier: number;
  golden_hour_remaining_seconds: number;
  // ...
}
```

---

### 2.6 프론트엔드 UI 상세

#### GoldenRealTimePage 기능

| 탭 | 기능 |
|----|------|
| **게임 스트림** | 실시간 WebSocket 이벤트 표시 |
| **인터벤션 로그** | 유저 ID 입력 → 개입 이력 조회 |

| 패널 | 내용 |
|------|------|
| **모니터링 상태** | WebSocket 연결, 지연 시간, 이벤트 처리율 |
| **빠른 필터** | 고액 베팅만, 당첨 이벤트만, 인터벤션 발동만 |

#### InterventionLogTable 트리거 색상

| 트리거 패턴 | 색상 |
|------------|------|
| `*LOSE*` | 🔴 빨강 (bg-red-500/20) |
| `*BAL_DROP*` | 🟠 주황 (bg-orange-500/20) |
| `*ZERO*` | 🟣 보라 (bg-purple-500/20) |
| 기타 | ⚫ 회색 (bg-gray-500/20) |

#### OpsDashboard Golden Radar 섹션

- `goldenRadar.churnRisks`: 이탈 위험 유저 수
- `goldenRadar.highRollers`: 고액 유저 수
- `goldenRadar.riskUsers[]`: 위험 유저 목록

---

### 2.7 Ops Plan 시스템

| 파일 | 설명 |
|------|------|
| `app/v2/api/admin_ops_plan.py` | Ops Plan 관리 API |
| `app/v2/services/v2_admin_ops_plan_service.py` | Ops Plan 서비스 |
| `app/models/ops_plan.py` | OpsCampaign, OpsPlan, OpsPlanTask 모델 |
| `app/models/ops_target.py` | OpsTargetList, OpsTargetMember 모델 |

**지원 액션 (Action Kinds):**
| Kind | 설명 | 처리 방식 |
|------|------|----------|
| `INVENTORY_GRANT_ALL` | 전체 유저 일괄 지급 | Async Worker |
| `TARGETED_ITEM_GRANT` | 타겟 리스트 대상 지급 | Async Worker |
| `GOLDEN_HOUR` | 골든아워 상태 제어 | Redis Pub/Sub |
| `TARGETLIST_BROADCAST` | 타겟 리스트 상태 마킹 | Sync/Async |
| `MESSAGE_TEMPLATE` | 메시지 템플릿 발송 | Async Worker |

---

### 2.8 메시징 시스템

| 파일 | 설명 |
|------|------|
| `app/api/routes/crm_inbox.py` | CRM 인박스 API |
| `app/models/admin_message.py` | AdminMessage, AdminMessageInbox 모델 |
| `app/v2/models/v2_admin_message.py` | V2 메시지 모델 |

---

## 3. 테스트 커버리지

### 3.1 골든 관련 테스트 파일

```
tests/v2_tests/phase2_core/
├── test_cc_deposit_logic.py              ✅ 3 tests passed
├── test_ch25_event_publish.py            ✅ 3 tests passed
└── test_golden_intervention_service.py   ✅ 3 tests passed
```

### 3.2 테스트 내용

| 테스트 파일 | 검증 항목 |
|-------------|----------|
| `test_cc_deposit_logic.py` | CC Deposit 후 레벨/XP 부여, V2LevelXPService 연동 |
| `test_ch25_event_publish.py` | Redis Pub/Sub 이벤트 발행/구독 |
| `test_golden_intervention_service.py` | TRG_LOSE_5 트리거, 쿨다운 로직, DB 로깅 |

---

## 4. 미구현/부분 구현 항목

### 4.1 미구현 (❌)

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| **데일리 넛지** | 매일 정해진 시간에 무료 토큰 정보 발송 | 🔴 High |
| **팀 배틀 알림** | 팀 배틀 시작/랭킹 변동 알림 | 🟡 Medium |
| **Circuit Breaker** | 과다 지급 시 자동 중단 | 🔴 High |
| **Rollback 정책** | 지급 회수 로직 | 🟡 Medium |
| **A/B 테스트** | 개입 효과 측정용 분리 테스트 | 🟢 Low |

### 4.2 부분 구현 (⚠️)

| 항목 | 현재 상태 | 필요 작업 |
|------|----------|----------|
| **자동 푸시 알림** | 텔레그램 발송 로직 존재 | 인터벤션 → 자동 발송 연결 |
| **개인화 메시지** | 템플릿 시스템 존재 | 자동 발송 스케줄러 구현 |
| **리텐션 효과 측정** | ROI 로그 테이블 존재 | analyze_retention.sql 연동 |

---

## 5. 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────────────┐
│                      골든 프로젝트 아키텍처                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   [유저 액션] ─────────────────────────────────────────────────  │
│       │                                                          │
│       ▼                                                          │
│   [게임 서비스] ──────► Redis(ch25_events)                        │
│       │                      │                                   │
│       │                      ▼                                   │
│       │              [golden_event_worker]                       │
│       │                      │                                   │
│       │                      ▼                                   │
│       │              [golden_intervention_worker]                │
│       │                      │                                   │
│       │         ┌────────────┼────────────┐                     │
│       │         ▼            ▼            ▼                     │
│       │    TRG_LOSE_5   밸런스하락    (확장가능)                  │
│       │         │            │            │                     │
│       │         └────────────┼────────────┘                     │
│       │                      ▼                                   │
│       │         [golden_intervention_service]                    │
│       │                      │                                   │
│       │         ┌────────────┴────────────┐                     │
│       │         ▼                         ▼                     │
│       │    [DB 로그 기록]          [관제 대시보드]               │
│       │                                   │                     │
│       │                          [GoldenRealTimePage]           │
│       │                                                          │
│   [텔레그램 봇] ◄────────────────────────────────────────────    │
│       │                                                          │
│       ▼                                                          │
│   [미니앱(TMA)] ──────► 기존 React UI                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. 환경 설정

### 6.1 필수 환경변수

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_MINI_APP_URL=https://your-domain.com

# Redis (이벤트 Pub/Sub)
REDIS_URL=redis://localhost:6379

# 인터벤션 설정
CH25_INTERVENTION_ENABLED=true
CH25_INTERVENTION_ROLLOUT_PCT=100
CH25_INTERVENTION_SEED=42
```

### 6.2 선택 환경변수 (Webhook 모드)

```env
TELEGRAM_USE_WEBHOOK=true
TELEGRAM_WEBHOOK_URL=https://your-domain.com
TELEGRAM_WEBHOOK_PORT=8443
TELEGRAM_WEBHOOK_PATH=/telegram/webhook
TELEGRAM_WEBHOOK_SECRET_TOKEN=your_secret
```

---

## 7. 관련 문서

| 문서 | 위치 |
|------|------|
| 골든 시스템 정의 | `docs/v2_specs/07_golden/golden_v2_system_definition_ko.md` |
| 인터벤션 로직 | `docs/v2_specs/07_golden/golden_v2_intervention_logic_ko.md` |
| 운영 로직 | `docs/v2_specs/07_golden/golden_v2_operational_logic_ko.md` |
| 골든아워 정책 | `docs/v2_specs/07_golden/v2_golden_hour_policy_sot_ko.md` |
| API 계약 | `docs/v2_specs/07_golden/v2_golden_api_contract_ko.md` |
| DB 데이터 맵 | `docs/v2_specs/07_golden/v2_db_golden_data_map_ko.md` |
| 실시간 아키텍처 | `docs/v2_specs/07_golden/02_golden_v2_realtime_architecture.md` |
| 경제 용어집 | `docs/v2_specs/07_golden/golden_v2_core_economy_glossary_ko.md` |
| 쉬운 설명서 | `docs/v1archive/09_marketing/golden/이해.md` |

---

## 8. 다음 단계 (Roadmap)

### Phase 1: 자동 알림 연결 (우선순위 🔴)
- [ ] 인터벤션 발생 시 텔레그램 DM 자동 발송
- [ ] 푸시 알림 Rate Limit 관리

### Phase 2: 스케줄러 구현 (우선순위 🔴)
- [ ] 데일리 넛지 스케줄러 (APScheduler/Celery)
- [ ] 무입금 유저 재방문 유도 메시지

### Phase 3: 안전장치 (우선순위 🟡)
- [ ] Circuit Breaker 구현
- [ ] Rollback 정책 구현

### Phase 4: 효과 측정 (우선순위 🟢)
- [ ] A/B 테스트 프레임워크
- [ ] 리텐션 효과 대시보드

---

## 9. 변경 이력

| 버전 | 날짜 | 작성자 | 내용 |
|------|------|--------|------|
| v2.0 | 2026-01-26 | GitHub Copilot | 통합 현황 문서 최초 작성 |
