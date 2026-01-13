# Vault Admin Page Redesign Specification: Operations Command Center

> **Target**: 리텐션 턴어라운드(RTP)를 위한 **실시간 금고 작전 지휘소(Vault Ops Command Center)** 구축.
> **Principles**: Data-First (데이터 우선), Action-Oriented (즉시 개입), Token-Based Design (표준 준수).

## 1. 개요 (Overview)

기존의 정적인 설정 페이지를 탈피하여, `retention_turnaround_plan.md`의 **1인 운영관**이 실시간으로 금고 현황을 파악하고 즉각적인 개입(Manual Intervention)을 할 수 있는 **통합 관제 화면**으로 재설계합니다.

### 1-1. 핵심 개선 목표

1. **가시성 (Visibility)**: 입금(Deposit), 출금(Withdraw), 적립(Accrual) 흐름의 실시간 시각화.
2. **즉시성 (Immediacy)**: 이상 징후 포착 시 즉시 개입(잠금 해제, 강제 지급, 비상 정지) 기능 제공.
3. **기록 (Traceability)**: 모든 수동 조작의 **OpsLog** 자동 연동 (운영로그설계서 준수).

---

## 2. 레이아웃 및 아키텍처 (Obsidian Command Layout)

신규 **Premium Design System**을 적용하여 정보 밀도와 시각적 안정감을 동시에 추구합니다. (`max-w-[1600px]`, `px-8 py-10`).

### 2-1. Layer 1: Live Status Header (Hero Section)

상단에 핵심 KPI를 배치하여 현재 금고 상태를 한눈에 파악.

* **배경**: `bg-admin-bg` (Obsidian #09090b)
* **컴포넌트**: `VaultDashboardMetrics` (NEW)
* **디자인**: `admin-card-premium` (Glassmorphism, Blur 12px) 적용.
* **지표 구성**:
    1. **Today's Flows**: 입금액 / 출금액 / 순유입 (Net Flow).
    2. **Total Liability**: 총 유저 보유 금고 잔액 (잠재 부채).
    3. **Pending Requests**: 출금 대기 건수 (클릭 시 하단 필터링).
    4. **Golden Hour**: 현재 상태 (ON/OFF) 및 스위치.

### 2-2. Layer 2: Operations Console (Main Action Area)

화면 중앙을 차지하는 실무 영역. 3단 그리드 (`lg:grid-cols-3`) 적용.

* **Left (Col-Span-2) - Execution**: `VaultRequestManager` (출금 요청 처리).
  * **UI 개선**: `admin-table` 적용. 헤더 패딩 `px-4 py-3.5`, 바디 `px-4 py-4`.
  * **Data**: 유저 닉네임, 등급(VIP), 요청 금액, 처리 상태.
  * **Action**: 승인(Approve), 반려(Reject), 강제 보류(Hold) - `btn-admin-primary` 적용.
* **Right (Col-Span-1) - Intelligence**: `VaultTopEarners` (상위 적립 유저 & 리스크) [NEW].
  * **Top Earners**: 금일 적립 상위 5인. `text-admin-body` (16px) 적용.
  * **Whale Watch**: 고액 입금자 실시간 피드.
  * **Risk Radar**: 단시간 다량 적립(어뷰징 의심) 유저 경고.

### 2-3. Layer 3: Control Tower (Control & Logs)

하단에 배치하여 설정을 관리하고 운영 이력을 추적. `admin-card`로 감싸 시각적 분리.

* **Tabs**:
    1. **Config & Rules**: 기존 `VaultRulesEditor`, `Settings` 통합.
    2. **UI Content**: `VaultUiEditor` (클라이언트 노출 문구).
    3. **Ops Logs**: 해당 페이지에서 발생한 `OpsLogEntry` 히스토리.

---

## 3. 상세 컴포넌트 명세 (Detailed Component Specs)

### 3-1. `VaultDashboardMetrics` (New)

* **Path**: `src/admin/components/vault/VaultDashboardMetrics.tsx`
* **Data Source**: `fetchVaultStatsDetails`.
* **Style**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`.
* **Cards**: `h-32` 고정 높이, 값은 `text-admin-title` (30px/800).

### 3-2. `VaultRequestManager` (Refactor)

* **Path**: `src/admin/components/vault/VaultRequestManager.tsx`
* **Style**: `admin-table` (Glassmorphism Header).
* **Search**: `h-11 bg-admin-sidebar/50 focus:ring-admin-brand/50`.
* **Interactions**: Row Hover 시 `bg-admin-hover` + 좌측 `2px admin-brand` Bar 표시.

### 3-3. `VaultTopEarners` (New Widget)

* **Path**: `src/admin/components/vault/VaultTopEarners.tsx`
* **Style**: `admin-card` 내부 List View (`space-y-4`).
* **Typography**: 이름 `text-admin-body`, 금액 `text-admin-mono`.

### 3-4. `VaultControlPanel` (Consolidation)

* **Path**: `src/admin/components/vault/VaultControlPanel.tsx`
* **Input**: `h-11 bg-admin-sidebar/50` 적용. Label은 `text-admin-meta uppercase font-bold`.
* **Validation**: 규칙 변경 시 Diff 보여주는 `ConfirmModal` (Glassmorphism Backdrop).

---

## 4. 디자인 토큰 매핑 가이드 (Premium Design Token Mapping)

User Request에 정의된 **Premium Obsidian Theme** 토큰으로 전면 교체합니다.

| 용도 (Role) | 적용 토큰 (CSS Variable / Class) | Hex Value | 비고 |
| :--- | :--- | :--- | :--- |
| **Page Background** | `bg-admin-bg` | `#09090b` | Obsidian (최외곽) |
| **Sidebar/Input BG** | `bg-admin-sidebar` | `#0f0f12` | 사이드바, 입력창 배경 |
| **Card (Glass)** | `admin-card` / `admin-card-premium` | `rgba(24, 24, 27, 0.6)` | Blur 12px, Border 0.08 alpha |
| **Primary Text** | `text-admin-text-primary` | `#fafafa` | 부드러운 화이트 (가독성 최적화) |
| **Secondary Text** | `text-admin-text-secondary` | `#a1a1aa` | 설명 텍스트 |
| **Brand Color** | `text-admin-brand` / `bg-admin-brand` | `#6366f1` | Indigo (Active/Primary) |
| **Accent Color** | `text-admin-accent` | `#10b981` | Emerald (Success) |
| **Warning Color** | `text-admin-warning` | `#f59e0b` | Amber (Warning) |
| **Danger Color** | `text-admin-danger` | `#f43f5e` | Rose (Critical Action) |

### 4-1. Typography Scale Rules

| Level | Class | Spec | Usage |
| :--- | :--- | :--- | :--- |
| **Title 1** | `text-admin-title` | 30px (1.875rem) / 800 | 페이지 H1, KPI 숫자 |
| **Title 2** | `text-admin-subtitle` | 20px (1.25rem) / 700 | 섹션/카드 제목 |
| **Body** | `text-admin-body` | 16px (0.9375rem) / 500 | 일반 본문, 데이터 |
| **Caption** | `text-admin-meta` | 14px (0.75rem) / 500 | 라벨, 캡션 |
| **Code** | `text-admin-mono` | 15px (0.8125rem) / 600 | 금액, ID, 식별자 |

> **Contrast Note**: `#a1a1aa` (Secondary) on `#09090b` (Bg) → Contrast Ratio **5.3:1** (Pass AA).
> `#fafafa` (Primary) on `#09090b` (Bg) → Contrast Ratio **15.6:1** (Pass AAA).

---

## 5. 구현 시나리오 (Implementation Workflow)

1. **Skeleton Setup**: `VaultDashboardMetrics`, `VaultTopEarners` 빈 컴포넌트 생성.
2. **Layout Refactor**: `VaultAdminPage.tsx`를 3-Layer 구조로 재작성.
3. **Migration**: 기존 `RequestManager`, `RulesEditor` 등의 로직 이식 및 스타일 리팩토링.
4. **Integration**:
    * `adminTopEarnersApi` (신규 필요 시) 연결.
    * `GoldenHour` 토글 연동.
    * **OpsLog** 기록 로직 삽입.
5. **Verify**: 2-Step Confirm 동작 확인 및 Dark Mode 시인성 점검.

---

## 6. 참고 문서 (References)

* `docs/06_ops/audit/admin_ui_standards.md`: 디자인 시스템 원본.
* `docs/06_ops/202601/[20261월첫째주]retention_turnaround_plan.md`: 운영 전략 및 Golden Hour 정의.
* `docs/06_ops/audit/202601운영로그설계서.md`: 로그 스키마 및 연동 규칙.
