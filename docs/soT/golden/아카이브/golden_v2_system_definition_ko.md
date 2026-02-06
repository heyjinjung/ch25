문서 타입: 정책/규격
버전: v1.3
작성일: 2026-01-19
작성자: Antigravity Agent
대상: 기획/개발/운영 팀
상태: SoT

# Golden V2 System Definition (골든 프로젝트 시스템 정의서)

## 1. 목적 (Purpose)
골든 프로젝트(Golden Project)의 V2 시스템 정의를 확립한다. 골든 프로젝트는 단순 마케팅 캠페인이 아니 
라, **"데이터 기반의 유기적 리텐션 운영 시스템 (Organic Retention Operations System)"**으로 정의한다. 본 문서는 시스템의 핵심 철학, 구성 요소, 그리고 V2 아키텍처 내 위상을 규정한다.

## 2. 범위 (Scope)
- **Golden Core**: 적응형 리텐션 엔진 (Adaptive Retention Engine)
- **Golden Ops**: 관제 및 개입 시스템 (Operations & Intervention)
- **Golden Data**: 증거 기반 의사결정 데이터 파이프라인 (Evidence Pipeline)

## 3. 용어 정의 (Definitions)
- **Golden System**: 유저 행동 데이터를 실시간 분석하여 최적의 개입(Intervention)을 수행하는 자동화 시스템.
- **Intervention (개입)**: 유저 행동 변화를 유도하기 위한 시스템적 액션 (예: 푸시, 보상 지급, 난이도 조절).
- **Golden Time**: 유저가 이탈할 확률이 높거나, 결제할 확률이 가장 높은 결정적 순간.
- **Evidence (증거)**: 개입의 효과를 증명하는 전후 데이터 세트 (Control vs Test).

---

## 4. 시스템 아키텍처 (System Architecture)

Golden V2는 **Loop Architecture**를 따른다.

```mermaid
graph TD
    User[User User Behavior] -->|Real-time Events| Collect[Data Collection]
    Collect -->|Log Pipeline| Analyze[Golden Engine (Analysis)]
    Analyze -->|Decision Rule| Action[Intervention (Action)]
    Action -->|API/Socket| User
    Action -->|Ops Log| Admin[Admin & Dashboard]
    Admin -->|Feedback| Analyze
```

### 4.1. Core Components
1.  **Monitor (감지)**: `v2_realtime_architecture` 기반의 이벤트 수집.
2.  **Decide (판단)**: 룰 엔진 및 AI 모델(페르소나 분석)을 통한 개입 여부 결정.
3.  **Act (실행)**: 게임 내 재화 지급, 모달 팝업, 푸시 발송, 상점 상품 변경 등.
4.  **Verify (검증)**: 실행 결과(Retention, ROI) 분석 및 피드백.

---

## 5. 핵심 로직 (Core Logic)

### 5.1. Intervention Logic (개입 로직)
- **트리거(Trigger)**: 특정 조건(이탈 징후, 연패, 재화 고갈 등) 만족 시 발동.
- **쿨다운(Cooldown)**: 과도한 개입 방지를 위한 글로벌/개별 쿨다운 적용.
- **우선순위(Priority)**: 다수의 개입 충돌 시 우선순위(예: 결제 방어 > 이탈 방어 > 일반 이벤트) 호 
출.

### 5.2. Operations Logic (관제 로직)
- **투명성(Transparency)**: 모든 개입은 `OpsLog`에 기록되어야 한다(`Who`, `When`, `What`, `Why`).
- **안전성(Safety)**: 임계값(Threshold)을 초과하는 자동 개입은 차단되거나 승인을 요구해야 한다. (Circuit Breaker)
- **복구(Recovery)**: 잘못된 개입은 즉시 중단 및 롤백(Rollback) 가능해야 한다.

### 5.3. Evidence Logic (증거 로직)
- **A/B 테스트**: 주요 개입은 실험군/대조군 설정이 가능해야 한다.
- **ROI 분석**: 투입된 재화(Cost) 대비 발생한 가치(LTV 증분)를 자동 계산한다.

---

## 6. V2 통합 규칙 (Integration Rules)
- **Database**: Golden 데이터는 V2 DB 스키마(`docs/v2_specs/04_db`)를 따른다.
- **API**: 개입 실행은 V2 API(`docs/v2_specs/03_api`)를 통해서만 수행된다.
- **Admin**: 모든 설정과 로그는 어드민 대시보드(`docs/v2_specs/05_ops`)에 통합된다.

---

## 7. SoT 확장 (2026-01-28)

### 7.1 Loop Architecture의 실체(채널/엔드포인트)

| 단계 | SoT(채널/엔드포인트) | 요약 |
| :--- | :--- | :--- |
| Collect | `ch25_events` → `golden:v2:events:game` | 원본 이벤트를 V2 표준 스트림으로 브릿지 |
| Analyze | `golden:v2:events:game` | 워커/서비스가 구독해 트리거 판단 |
| Act | `golden:v2:events:intervention` | 개입 이벤트 발행(유저 푸시) |
| Admin Monitor | `/api/v2/admin/ws/golden/events` | 운영자 관제를 위한 게임 이벤트 실시간 스트림 |

### 7.2 Human-in-the-loop(승인) 통합 규칙

- 트리거 감지 즉시 자동 지급/발송 금지.
- 감지 시점에 `PENDING_APPROVAL`로 적재하고 운영자 승인 후에만 발송/지급.
- 상태 SoT: `PENDING_APPROVAL` → `APPROVED`/`REJECTED` → `SENT`.

### 7.3 Admin 실시간 관제 엔드포인트 SoT

| 구분 | 엔드포인트 | 대상 |
| :--- | :--- | :--- |
| Admin WebSocket | `/api/v2/admin/ws/golden/events` | 어드민 대시보드 |

---

## 8. 변경 이력
- v1.3 (2026-01-28, GitHub Copilot): Admin WebSocket 경로를 /api/v2 기준으로 재정합.
- v1.2 (2026-01-28, GitHub Copilot): 미구현 채널 표기 정정 및 Admin 관제 엔드포인트를 /api/v2 기준으로 정합화.
- v1.1 (2026-01-28, GitHub Copilot): 채널/엔드포인트/승인루프 SoT 확장(운영 플로우 정합).
- v1.0 (2026-01-19, Antigravity Agent): 문서 생성. 기존 마케팅 문서를 SoT로 승격.
