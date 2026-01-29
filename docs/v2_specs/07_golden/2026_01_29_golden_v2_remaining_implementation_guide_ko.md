# Golden V2 잔여 구현 항목 가이드 (Remaining Implementation Guide)

**문서 타입**: 구현 가이드 (Implementation Guide)
**작성일**: 2026-01-29
**대상**: Golden V2 개발팀
**프로젝트**: Golden V2 (Phase 2~4)

---

## 1. 개요 (Overview)

본 문서는 Golden V2 프로젝트 중 **이미 구현된 항목**과 현재 최우선으로 진행 중인 **Latency Survival(Phase 4-Early)**을 제외한, 향후 구현이 필요한 잔여 항목들의 우선순위와 상세 기술 가이드를 정의합니다.

### 1.1 대상 항목 및 우선순위

| 우선순위 | 항목 | Phase | 설명 |
| :--- | :--- | :--- | :--- |
| **1 (High)** | **Circuit Breaker 연동** | Phase 2 | 과다 지급 사고 방지를 위한 운영 안전장치 |
| **2 (High)** | **Daily Nudge Scheduler** | Phase 2+ | 리텐션 유지를 위한 일일 무료 토큰 자동 발송 |
| **3 (Medium)** | **Rollback Policy** | Phase 3 | 잘못된 개입(Intervention) 회수 자동화 |
| **4 (Medium)** | **A/B Test Framework** | Phase 3+ | 개입 시나리오별 효과 측정 및 최적화 |
| **5 (Low)** | **ROI Calculator Service** | Phase 4 | 개입 후 24시간 내 행동 추적 및 ROI 계산 |

---

## 2. 상세 구현 가이드 (Detailed Implementation Guide)

### 2.1 [High] Circuit Breaker 연동 (운영 안전장치)

**목적**: 시스템 오류나 어드민 실수로 인해 과도한 재화가 풀리는 것을 물리적으로 차단합니다.

- **기술 스펙**:
    - **Redis Key**: `golden:v2:circuit:{token_type}:hourly_limit`
    - **Logic**:
        - `InventoryService` 및 `VaultService`의 지급(`grant`) 메서드에 인터셉터 추가.
        - 시간당 총 지급액이 임계치(Threshold)를 초과하면 즉시 `CircuitBreakerError` 발생 및 지급 차단.
        - **Slack/Telegram Alert** 즉시 발송.
- **설정값 (Config)**:
    - `CIRCUIT_LIMIT_VAULT`: 시간당 1,000,000 KRW
    - `CIRCUIT_LIMIT_TICKET`: 시간당 500장
- **SoT 참조**: `docs/v2_specs/07_golden/golden_v2_operational_logic_ko.md`

### 2.2 [High] Daily Nudge Scheduler (데일리 넛지)

**목적**: 유저가 앱을 잊지 않도록 매일 정해진 시간에 "작은 보상" 알림을 보냅니다.

- **기술 스펙**:
    - **Worker**: Celery Beat 스케줄러 (`app.worker.celery_app`)
    - **Schedule**: 매일 12:00, 18:00 KST (Configurable)
    - **Targeting**: 최근 3일 내 접속했으나 오늘 접속 안 한 유저 (`V2UserActivity` 참조).
    - **Action**:
        - 1) `InventoryService`를 통해 `TRIAL_TICKET` 1장 지급.
        - 2) 텔레그램 메시지 발송 ("오늘의 무료 티켓이 도착했습니다!").
- **제약 사항**:
    - `benefits_suspended` (7일 무입금) 유저는 대상에서 제외.

### 2.3 [Medium] Rollback Policy (개입 회수)

**목적**: 오발송된 개입(Intervention)이나 보상을 안전하게 회수합니다.

- **기술 스펙**:
    - **기반 데이터**: `v2_admin_action_audit` (어드민 액션 로그) 또는 `v2_ops_execution_result`.
    - **API**: `POST /api/v2/admin/ops/rollback/{execution_id}`
    - **Logic**:
        - 1) 해당 Execution ID로 지급된 모든 유저와 금액 조회.
        - 2) 각 유저의 현재 잔액 확인.
        - 3-A) 잔액 충분 시: 차감(`consume`) 후 '회수 완료' 마킹.
        - 3-B) 잔액 부족 시: 0으로 만들고 부족분은 `Audit Log`에 '미수금' 기록 (무리한 마이너스 처리 지양).

### 2.4 [Medium] A/B Test Framework

**목적**: 어떤 개입(문구, 보상 종류)이 리텐션에 더 효과적인지 검증합니다.

- **기술 스펙**:
    - **Table**: `v2_ab_test_group` (User ID, Experiment ID, Group A/B)
    - **Assignment**: `MurmurHash(user_id + experiment_id) % 100` 로직으로 결정론적(Deterministic) 그룹 배정.
    - **Tracking**: 모든 이벤트 로그(`v2_intervention_log`, `v2_game_log`)에 `experiment_group` 태그 추가.

### 2.5 [Low] ROI Calculator Service

**목적**: 개입(비용) 대비 효과(입금/플레이)를 정량화합니다.

- **기술 스펙**:
    - **Trigger**: 개입(`Intervention`) 발생 24시간 후 Celery Task 실행.
    - **Calculation**:
        - **Cost**: 개입 시 지급된 재화의 가치 (KRW 환산).
        - **Benefit**: 개입 후 24시간 내 `cc_deposit` 증가분 + 게임 플레이 수수료(Rake).
        - **ROI**: `(Benefit - Cost) / Cost * 100` (%)
    - **Storage**: `v2_retention_roi_log` 테이블에 저장 및 대시보드 시각화.

---

## 3. Ops Plan 확장 (Action Kinds)

`v2_ops_plan` 테이블의 `action_kind` 필드를 통해 실행될 로직입니다.

- **INVENTORY_GRANT_ALL**: `Celery Chunk`를 사용하여 1000명 단위로 배치 지급 (DB 부하 분산).
- **TARGETED_ITEM_GRANT**: 업로드된 CSV(`v2_ops_target`) 대상자에게만 지급.
- **GOLDEN_HOUR**: Redis Pub/Sub으로 전 서버에 실시간 상태 전파.
- **TARGETLIST_BROADCAST**: 타겟 리스트 유저에게만 메시지 발송 (재화 지급 없음).

---

## 4. 참고 문서 (Reference)

- **Auth SoT**: `docs/v2_specs/00_sot_meta/v2_telegram_auth_sot_ko.md`
- **Troubleshooting**: `docs/v2_specs/00_sot_meta/v2_auth_trouble_mapping_ko.md`
- **Tech Guide**: `docs/v2_specs/00_sot_meta/v2_auth_technical_guide_ko.md`
