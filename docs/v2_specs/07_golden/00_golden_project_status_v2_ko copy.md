문서 타입: 통합 현황
버전: v2.0
작성일: 2026-01-26
작성자: GitHub Copilot
대상: 전체 팀
상태: SoT

# 🎯 골든 프로젝트 통합 현황 (Golden Project Status v2)

## 1. 개요 (Overview)

골든 프로젝트(Golden Project)는 단순한 마케팅 캠페인이나 보상 지급 도구가 아닙니다. 
이는 **"데이터 기반의 유기적 리텐션 운영 시스템 (Organic Retention Operations System)"**으로, 유저의 심리 상태와 행동 데이터를 실시간으로 감지하여 최적의 '개입'을 수행하고, 그 성과를 데이터로 '증명'하는 순환 구조(Closed-Loop)를 지향합니다.

V2에서는 기존의 자동화 로직에 **유연한 케어(Flexible Care)**와 **지능적 지연 대응(Latency Mitigation)** 전략을 더하여, 시스템과 유저 간의 정서적 유대를 강화하고 기술적 한계를 심리학적으로 극복하는 데 집중합니다.

### 1.1 핵심 3요소

골든 V2를 지탱하는 세 가지 기술적/전략적 기둥입니다.

| 요소 (Pillar) | 설명 (Description) | 핵심 기술 및 전략 |
| :--- | :--- | :--- |
| **실시간 개입 (Intervention)** | 적응형 리텐션 엔진(Adaptive Engine)을 통한 맞춤형 대응 | Redis Pub/Sub 기반 실시간 트리거, 동적 난이도 조절(DDA), 잭팟 천장(Pity System) |
| **유연한 케어 & 관제 (Care & Ops)** | 유저의 심리 자산화 및 운영자의 개입 통제권 확보 | **Flexible Care**: 한정판 뱃지, 스트릭 복구, 코호트 CPR <br> **Semi-Auto CRM**: Human-in-the-loop 기반 승인 루프 |
| **증거 수집 & 지연 대응 (Evidence & Mitigation)** | 데이터 기반 ROI 증명 및 외부 지연의 인터랙티브 해결 | **Evidence Pipeline**: ROI 가시화, 코호트 분석 <br> **Latency Survival**: 선지급 후검증(User-proof), Pending UX |

---

## 2. 구현 완료 항목
• 부분 구현 또는 미구현 (⚠️/❌):
    ◦ 증거 수집: ROI 로그 테이블은 존재하나 실제 리텐션 분석 SQL과의 자동 연동은 미비.
    ◦ 안전장치: 과다 지급 방지를 위한 서킷 브레이커 및 잘못된 개입 회수를 위한 롤백 정책 미구현.
    ◦ 자동 푸시: 텔레그램 발송 로직은 있으나 인터벤션 트리거와의 완전한 자동 연결 필요.

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
**[To-be Integrated] 추가 구현 코드:**
- **Streak Recovery Bot Command**: 미션 실패 유저에게 복구권 구매 제안 (TMA Deep Link 포함).
- **Latency Alert Notification**: 입금 증거 제출 유저에게 확인 진행 상황 알림 (WebSocket -> Bot Push).
- **Badge Achievement Alert**: 한정판 뱃지 획득 시 화려한 미니앱 효과 트리거 연동.


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
| `TRG_COHORT_CPR` | 코호트 리텐션 급감 | Cohort_Rescue_Package | 자동발동 |
> [!NOTE]
> 모든 트리거는 감지 즉시 실행되지 않고 `v2_golden_intervention_log`에 `PENDING_APPROVAL` 상태로 적재되어 관리자 승인을 대기합니다. (Phase 2 모델 적용 예정)

**Redis Pub/Sub 채널:**
```
ch25_events              # 원본 게임 이벤트
golden:v2:events:game    # V2 게임 이벤트
golden:v2:events:intervention  # 개입 이벤트
golden:v2:cooldown:*     # 쿨다운 키
golden:v2:user:*:psych_state  # 유저 심리 상태
golden:v2:user:*:session_start_balance  # 세션 시작 잔액
```

**[To-be Integrated] 추가 구현 코드:**
- **Human-in-the-loop Bridge**: 개입 발생 시 로그를 `PENDING_APPROVAL`로 즉시 기록하고 관리자 웹소켓 채널(`golden:v2:admin:queue`)에 발행.
- **Cohort Health Monitor**: Redis에 집계된 코호트별 리텐션 지표가 임계치 하락 시 `TRG_COHORT_CPR` 트리거 자동 발동.
- **Streak Protection Logic**: 유저의 `last_login`이 24시간 초과 전 'Golden Time' 내에 선제적 넛지 발송 로직 추가.
- **DDA Controller (Adaptive Logic)**: `current_loss_streak`에 따른 AI 배율 및 함정 확률 동적 조정 API 연동.
- **Circuit Breaker Middleware**: 개입 실행 전 시간당 총 지급액(Burn Rate) 및 에러율 감지 후 임계치 초과 시 즉시 차단 로직.
- **ROI Attribution Engine**: 개입 후 24시간 내 유저 행동(게임 플레이, CC 입금)을 트래킹하여 `v2_retention_roi_log.attributed_value` 계산 워커.

---

### 2.3 데이터베이스 모델

| 테이블 | 파일 | 용도 |
|--------|------|------|
| `v2_golden_intervention_log` | `app/v2/models/v2_golden_intervention_log.py` | 개입 로그 (감사 추적) <br> status 필드 포함 예정 |
| `v2_user_retention_state` | `app/v2/models/v2_user_retention_state.py` | 유저 리텐션 상태 |
| `v2_retention_roi_log` | `app/v2/models/v2_retention_roi_log.py` | 리텐션 기여도 및 CC 입금 ROI |

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

**[To-be Integrated] 추가 구현 코드:**
- **`v2_user_badge`**: 명예 시스템을 위한 뱃지 메타 및 유저 소유 리스트.
- **`v2_streak_log`**: 리텐션 방어의 핵심인 유저별 연속 접속 및 미션 수행 기록.
- **`v2_user_deposit_evidence`**: 지연 대응(Phase 4)을 위한 유저 제출 TX ID 및 사후 검증 결과 저장 테이블.
- **`v2_cohort_retention_stats`**: 일일 단위/코호트별 리텐션 및 LTV 증분 집계 테이블 (증거 센터용).
- **`v2_admin_action_audit`**: 반자동 CRM 승인/거절 이력 및 운영자 감사 로그 테이블.

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
---

3. 전략적 로드맵 (Strategic Roadmap)
본 로드맵은 Phase 1~4 상세 설계 내용을 실행 우선순위에 따라 재구성한 '심리학-데이터 통합' 실행 계획입니다.

1단계: 신뢰 기반의 '지연 극복' 및 증거 센터 구축 (Phase 4 + Phase 1)
High Priority | 데이터 지연 해결 및 ROI 가시화 기초

핵심 과제:
지연 극복 UX (Latency Survival): 외부 데이터 입고 지연(4~12시간) 동안 유저가 TX ID를 제출하면 임시 보상을 선지급하고 사후 검증하는 레이어 구축.
대기 시간 보상제: 입금 확인 대기 시간 1분당 포인트를 누적하여 대기 시간을 '이득'으로 치환.
TX ID 제출 UI: 유저가 입금 직후 트랜잭션 번호나 스크린샷을 제출하는 '증거 제출' 기능 구현.
증거 대시보드 (Evidence Dashboard): 골든 AI의 개입 내역을 실시간으로 숫자로 증명하는 Bento Grid UI 구축.
전략적 함의: 스타벅스의 별 적립 Progress Bar처럼 보상이 '숙성'되는 과정을 시각화하여 제이가르니크 효과를 통한 재방문을 유도합니다.
2단계: 자동화 엔진 및 반자동 CRM 완성 (Phase 2)
High Priority | 리얼타임 대응력 및 운영 통제권 확보

핵심 과제:
Human-in-the-loop 완성: '발송 대기 함' UI를 통해 관리자가 체리피커를 필터링하고 대량 승인하는 워크플로우 완성.
인터벤션-알림 자동화: 개입 발생 시 텔레그램 DM 자동 발송 및 Rate Limit 적용.
Approval Logic: PENDING_APPROVAL 상태값 도입 및 승인 API 연동.
체리피커 스코어링: 보상 수령 후 즉시 이탈하는 유저를 점수화하여 경고 표시.
전략적 함의: **듀오링고(Duolingo)**의 데일리 넛지처럼 손실 회피 심리를 자극하여 유저가 앱을 떠나지 않도록 적절한 타이밍에 개입합니다.
3단계: 유연한 보상 및 유저 케어 도입 (Phase 3)
Medium Priority | 비금전적 가치 기반 장기 잔존율 강화

핵심 과제:
SAPS 모델 (Status 보상): 금전적 보상 대신 한정판 뱃지, 스트릭 복구권 등 유저의 명예와 매몰 비용을 자극하는 보상 체계 도입.
코호트 방어(CPR): 특정 그룹의 리텐션 급감 시 자동으로 'CPR 패키지'를 투입하는 자동 방어 기제.
마이크로 미션 (Micro-mission): 유저가 매일 '작은 성취'를 느낄 수 있는 Floating UI 및 넛지 강화.
전략적 함의: **나이키 런 클럽(NRC)**의 지위적 자부심 부여 사례를 벤치마킹하여 현금 보상 감소 시의 이탈(과잉 정당화 효과)을 방어합니다.
4단계: ROI 최적화 및 A/B 테스트 (Phase 1 완성)
Low Priority | 데이터 파이프라인 완성 및 시스템 안전화

핵심 과제:
Attribution Engine: 개입 후 24시간 내 유저 행동(게임 플레이, CC 입금 기여도)을 정밀 트래킹하여 ROI 계산.
분석 퍼널 가시화: '추출 → 승인 → 발송 → 복귀'로 이어지는 5단계 퍼널 분석 대시보드 구축.
Experiment Framework: 개입 시나리오별 효과를 정밀하게 대조 분석하는 실험 도구 완성.
전략적 함의: **쿠팡(CPLB)**처럼 운영자에게 모든 개입의 '효율'이라는 증거를 지속적으로 제시하여 데이터 기반 성장을 달성합니다.

------------- // 여기까지만 구현계획 블루프린트 성립 

### 2.6 프론트엔드 
기술문서 : C:\Users\JAVIS\ch\ch25\docs\v2_specs\07_golden\2026_01_28_golden_frontend_spec.md 
---

### 2.7 Ops Plan 시스템
기술문서 : C:\Users\JAVIS\ch\ch25\docs\v2_specs\07_golden\2026_01_28_golden_v2_ops_plan_expansion_spec.md 

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
기술문서 : C:\Users\JAVIS\ch\ch25\docs\v2_specs\07_golden\integrated_working_tree.md
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

## 8. 변경 이력

| 버전 | 날짜 | 작성자 | 내용 |
|------|------|--------|------|
| v2.1 | 2026-01-28 | 관리자 | 블루프린트 작성 완료 |
| v2.0 | 2026-01-26 | GitHub Copilot | 통합 현황 문서 최초 작성 |
