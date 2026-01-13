# 202601 이벤트 운영계획(Admin) 구현 가이드 (MVP → 확장)

> 목적: “운영로그(감사/기록)”가 아니라 **매일매일 꾸준히/효율적으로 실행할 수 있는 ‘이벤트 운영계획(플레이북)’**을 어드민 시스템 안에 녹여 넣는다.
>
> 핵심 방향: 자동화는 있으면 좋지만 후순위. **먼저 운영자가 ‘계획→실행→체크→마감요약’을 한 화면에서 돌릴 수 있게 만드는 것**이 1순위.

---

## 0) 용어를 쉬운 말로(SoT)

운영팀이 실제로 쓰는 언어로 정리합니다.

- **캠페인(Campaign)**: “이번 주말 설문+골든아워+DM” 같이, 목표/기간/테마가 있는 운영 묶음(여러 날, 여러 실행 포함)
- **운영계획(Plan)**: 특정 날짜/상황에 “오늘 무엇을 언제/누구에게/어떻게 할지” 적어둔 실행 계획
- **작업(Task)**: 운영계획 안의 체크 항목 한 줄(예: 20:30 골든아워 FORCE_ON 2.5배)
- **대상자 목록(Target List)**: 오늘 DM/보상 지급할 사람 리스트(세그먼트/조건/수동 추가)
- **메시지 템플릿(Template)**: 공지/DM/감사 메시지 같은 문구 프리셋
- **실행 기록(Execution Record)**: “버튼 눌러 실행했다”는 시스템 기록(필요 시 멱등키 포함)
- **마감 요약(Closing Summary)**: 하루 끝에 KPI 스냅샷 + 특이사항 요약

> 중요한 구분
> - **운영계획(Plan)**은 “바뀌어도 정상”입니다. 운영 중에 시간/문구/대상이 계속 바뀝니다.
> - **운영로그(Log)**는 “바뀌면 문제”입니다. 감사/추적용으로 불변(immutable)이 맞습니다.
>
> 따라서 어드민에서 사용자가 체감하는 것은 **계획(Plan)**이어야 하고,
> 로그(Log)는 내부적으로 “실행 버튼을 눌렀다” 같은 증거를 남기는 보조 레이어여야 합니다.

---

## 1) 왜 운영계획이 필요한가(운영팀 관점)

운영팀이 매일 운영일지를 쓰는 이유는 아래 4개가 전부입니다.

1) **누락 방지**: 시간별 루틴(14:00 공지, 16:00 독려, 20:30 ON, 22:30 OFF…)을 체크로 고정
2) **컨텍스트 유지**: 오늘의 테마/키 메시지/목표를 한 화면에서 계속 보며 운영
3) **문구/시나리오/대상 관리**: ‘문구’와 ‘대상자 표’가 실제 운영의 중심
4) **마감 요약**: “오늘 무엇을 했고 결과가 어땠는지”를 다음날 의사결정으로 이어지게

즉, 운영일지는 보고서가 아니라 **컨트롤타워(작전 실행 화면)**입니다.

---

## 2) 목표 UX (어드민 안에서의 플로우)

### 운영자의 하루(또는 캠페인) 사용 흐름

1) 캠페인 선택(또는 새 캠페인 생성)
2) 오늘 운영계획(플랜) 열기
3) 자동 생성된 작업(시간 슬롯) 확인
4) 대상자 목록 만들기(세그먼트/조건/수동 추가)
5) 템플릿 선택 → 발송/지급/토글을 **버튼으로 실행**
6) 각 작업을 완료 체크(필요 시 메모)
7) 마감 시 KPI 스냅샷 저장 + 요약 작성

### 화면(최소 구성)

- **캠페인 목록 페이지**: 여러 캠페인 생성/복제/보관
- **캠페인 상세(대시보드)**: 오늘 플랜 카드 + 다음 작업 + 목표 + 특이사항
- **운영계획(플랜) 상세**: 타임라인 체크리스트 + 대상자 목록 + 템플릿 + 실행 버튼
- **마감/요약**: KPI 스냅샷 + 오늘 결론

---

## 3) 데이터 모델(계획 중심) — MVP

### 3-1. 핵심 테이블(추천)

> 아래는 “캠페인별 여러 개”를 자연스럽게 지원하기 위한 최소 스키마입니다.

#### A) `ops_campaign` (캠페인)
- `id` (PK)
- `name` (예: “Week1 D6 주말 설문+골든아워”)
- `status` (`DRAFT` | `ACTIVE` | `ARCHIVED`)
- `start_date`, `end_date` (선택)
- `owner_admin_id`
- `goal_json` (예: 목표 응답자 수, 목표 참여자 수)
- `notes_md` (캠페인 메모)
- `created_at`, `updated_at`

#### B) `ops_plan` (운영계획: 날짜/상황별)
- `id` (PK)
- `campaign_id` (FK)
- `plan_date` (DATE)
- `theme_title` (오늘 주력 테마)
- `key_message` (오늘 키 메시지)
- `status` (`DRAFT` | `RUNNING` | `DONE`)
- `closing_summary_md` (마감 요약)
- `kpi_snapshot_json` (마감 KPI 스냅샷)

> 중요: 과거 문서처럼 `date PK`로 고정하면 “캠페인별 여러 개”가 막힙니다.
> - 같은 날짜에도 캠페인이 여러 개 있을 수 있어야 합니다.
> - 따라서 `ops_plan`은 `id PK` + `(campaign_id, plan_date)` 유니크 정도가 적당합니다.

#### C) `ops_plan_task` (작업/체크리스트)
- `id` (PK)
- `plan_id` (FK)
- `slot_time` (예: `14:00`, `20:30`)
- `title` (예: “채널 공지: 주말 설문조사 시작”) 
- `type` (예: `BROADCAST`, `DM`, `TOGGLE`, `PAYOUT`, `NOTE`)
- `status` (`TODO` | `DOING` | `DONE` | `SKIPPED` | `BLOCKED`)
- `memo` (현장 메모)
- `payload_json` (실행에 필요한 입력값: 배수, 템플릿 id, 대상자 목록 id 등)
- `executed_at` (선택)
- `actor_admin_id` (마지막 수정/완료자)

#### D) `ops_target_list` / `ops_target_member`
- target_list: `id`, `plan_id`, `name`, `source_type`(SEGMENT/QUERY/MANUAL/CSV), `source_params_json`, `count_snapshot`, `created_at`
- member: `id`, `target_list_id`, `user_id`, `state_json`(발송/응답/지급 완료 등), `added_at`

#### E) `ops_message_template`
- `id`, `campaign_id`(또는 global), `channel`(TELEGRAM/INBOX/…), `name`, `content_md`, `variables_json`(예: {"multiplier": 2.5})

---

## 4) 기존 코드 재활용 전략(중요)

이미 만들어진 “운영로그” 기능을 버리기보다, **이름/역할만 바꿔서 내부 실행 기록 레이어로 재활용**합니다.

### 4-1. 재활용 가능한 것(그대로 살릴 것)

- **Quick Logger UI/패널**: UI를 “운영기록”이 아니라 “작업 실행”에 붙이는 방식으로 재활용
- **Routine Tracker**: `ops_plan_task`의 slot_time 체크 UI로 재활용
- **Golden Hour 패널**: `ops_plan_task(type=TOGGLE)`의 실행 폼으로 재활용
- **Survey/DM 패널**: `ops_target_list` 기반 발송/보상 작업으로 재활용
- **멱등키(ref_id) + React Query 캐싱 패턴**: 실행 버튼 중복 클릭 방지/재시도 안전장치로 그대로 사용
- **PII 가드**: 운영계획 텍스트에 전화/계좌 등 민감정보가 들어가는 것을 방지하는 안전장치로 유지

### 4-2. 바꿔야 하는 것(역할 전환)

- “운영로그 페이지(/admin/ops)”를 **운영계획 페이지(/admin/ops/plans)**로 재포지셔닝
- action_code 중심 입력은 운영팀에게 어려움 → UI에서는 **쉬운 작업 이름/프리셋**을 먼저 보여주고,
  내부적으로만 action_code를 매핑(필요 시)

---

## 5) API 설계(계획 중심) — MVP

> 기존 `/admin/api/ops/log-entry`는 ‘실행 기록’ 또는 내부 이벤트로 남기고,
> 사용자(운영자) 화면의 주 API는 plan/campaign/task가 됩니다.

### 5-1. 캠페인
- `POST /admin/api/ops/campaigns`
- `GET /admin/api/ops/campaigns?status=ACTIVE`
- `POST /admin/api/ops/campaigns/{id}/clone` (복제: 템플릿/기본 작업 세트 포함)

### 5-2. 운영계획(플랜)
- `POST /admin/api/ops/plans` (campaign_id, plan_date)
  - 없으면 생성, 있으면 반환(편의상 upsert 가능)
- `GET /admin/api/ops/plans?campaign_id=...&date=YYYY-MM-DD`
- `PATCH /admin/api/ops/plans/{id}` (theme/key_message/closing_summary/kpi_snapshot)

### 5-3. 작업(체크리스트)
- `POST /admin/api/ops/plans/{plan_id}/tasks` (슬롯/타이틀/타입/payload)
- `PATCH /admin/api/ops/tasks/{task_id}` (status/memo/payload)
- `POST /admin/api/ops/tasks/{task_id}/execute` (실행 버튼)
  - 내부적으로 필요한 경우만 기존 log-entry를 남김

### 5-4. 대상자 목록
- `POST /admin/api/ops/plans/{plan_id}/target-lists` (segment/query/manual)
- `GET /admin/api/ops/target-lists/{id}`
- `POST /admin/api/ops/target-lists/{id}/members` (user_id 추가)
- `PATCH /admin/api/ops/target-members/{id}` (발송/응답/지급 상태 업데이트)

---

## 6) 실행(버튼) 설계 원칙

### 6-1. 실행 버튼은 “계획(Task)”에 붙는다
- 예: “20:30 골든아워 FORCE_ON 2.5배” 작업 카드 안에
  - 배수 입력
  - FORCE_ON 버튼
  - 완료 체크
  - 메모

### 6-2. 안전장치(중요)
- **멱등키(ref_id)**: 지급/발송/토글은 반드시 멱등키로 중복 실행을 막음
- **2단계 확인(Confirm)**: 대량 발송/대량 지급/토글 같은 고위험 버튼은 확인 모달
- **권한 분리**: 실행 권한(지급/발송/토글)과 계획 편집 권한을 분리할 수 있게 설계

### 6-3. 내부 실행 기록은 “보조”
- 운영자가 보는 것은 “작업이 DONE인지”가 핵심
- 시스템은 필요한 경우에만 기존 log-entry(또는 execution table)에 기록

---

## 7) MVP 구현 순서(가장 빠른 길)

### Step 1. FE: /admin/ops를 “운영계획”으로 이름/문구부터 바꾸기
- 메뉴명: “운영일지/로그” → “운영계획(플레이북)”
- 페이지 타이틀/설명도 쉬운 말로 교체

### Step 2. BE: 캠페인/플랜/작업 테이블 + CRUD
- 우선 `ops_campaign`, `ops_plan`, `ops_plan_task` 3개만으로도 운영이 가능

### Step 3. FE: 기존 컴포넌트를 Task UI로 재배치
- Routine Tracker → Task 리스트
- Golden Hour Panel → 해당 Task에 포함
- Survey/DM Panel → 대상자 목록 기반 Task로 포함

### Step 4. 대상자 목록(Target List) 붙이기
- 세그먼트/조건 선택 → 리스트 고정
- 멤버별 상태(발송/응답/지급) 체크 가능

### Step 5. 마감 요약 + KPI 스냅샷
- 마감 버튼으로 “오늘 결과 저장”
- KPI는 자동이 아니어도 됨(수동 입력 → 추후 자동 연동)

---

## 7.1) 현재 진행도 (2026-01-13)

> 상태 정의
> - **DONE**: 운영자가 실제로 사용할 수 있는 기본 루프가 구현됨
> - **PARTIAL**: 핵심은 있으나, 가이드 목표 UX 대비 일부 미완/임시
> - **TODO**: 아직 구현 없음

### A) Step 1~5 기준 진행도

- **Step 1 (FE 재포지셔닝)**: **PARTIAL**
  - 라우팅은 `/admin/ops`의 index가 운영계획 화면(Plan)이며, `/admin/ops/logs`에 기존 로그 화면이 분리되어 있음.
  - 메뉴명/카피를 “운영계획(플레이북)”으로 정리하는 작업은 별도 확인/보강 필요.

- **Step 2 (BE: 캠페인/플랜/작업 CRUD)**: **DONE**
  - 캠페인/플랜/작업 API가 `/admin/api/ops/*`로 제공됨.
  - 플랜은 `(campaign_id, plan_date)` 유니크 전제로 `ensure`(없으면 생성, 있으면 반환) 패턴으로 동작.

- **Step 3 (FE: Task 중심 UI 배치)**: **PARTIAL**
  - 운영계획 화면에서 캠페인 선택 → 오늘 플랜 생성/조회 → Task CRUD/상태 업데이트/실행(버튼) 흐름이 가능.
  - 다만 “기존 Golden Hour/Survey 패널 완전 재활용” 수준까지는 아직 아니고, Task 타입별 입력 UI는 점진 확장 중.

- **Step 4 (대상자 목록 Target List)**: **TODO**
  - `ops_target_list/ops_target_member` 모델/CRUD/화면은 아직 없음.

- **Step 5 (마감 요약 + KPI 스냅샷)**: **TODO**
  - `closing_summary_md`, `kpi_snapshot_json` API 필드는 존재하지만, 어드민에서 입력/저장 UI는 아직 없음.

### B) 가이드 외(하지만 운영 목표에 유의미한) 추가 구현

- **실험/효과 추적(확장)**: Task의 `payload_json.experiment`로 “표준 지표 드롭다운 + before/after + 기간 + 근거/메모”를 기록할 수 있게 FE가 확장됨.
- **플레이북 액션 카탈로그(전수 구현)**: 
  - 리텐션 턴어라운드 플랜([RTP])에 정의된 **매일 루틴(4개), 2주 집중 운영 일정(14개), 상황별 정밀 타격 시나리오(10개)** 등 총 28개 이상의 핵심 액션을 FE 프리셋(`opsPlaybookCatalog.ts`)으로 100% 이식 완료.
  - 이제 운영자는 드롭다운 선택만으로 전략 보고서의 모든 시나리오를 즉시 실행 계획(Task)으로 전환 가능.

### C) 현재 범위에서의 ‘실행(Execute)’ 의미

- 현재 execute는 “외부 시스템을 실제로 실행”하기보다, **Task의 `executed_at/status`를 업데이트**하는 형태의 MVP에 가깝습니다.
- 향후 토글/대량 발송/대량 지급 같은 고위험 액션은 가이드의 원칙대로 **2단계 확인 + 멱등키(ref_id)**를 붙여 확장하는 것을 권장합니다.

---

## 8) 확장(나중에 붙이면 좋은 것)

- 마크다운 Export: 운영계획을 `[YYYYMMDD]_운영일지.md` 형태로 내보내기
- KPI 자동 삽입 버튼: “오늘 KPI 가져오기”
- 자동화: Outbox/WS는 계획(Task) 실행 이벤트를 실시간 피드로 뿌리는 용도로만 점진 도입

---

## 9) 운영팀이 바로 쓰게 만드는 체크리스트(정리)

- [ ] 캠페인을 여러 개 만들 수 있는가?
- [ ] 캠페인 안에 하루 플랜을 여러 개 만들 수 있는가?
- [ ] 플랜에는 시간 슬롯 기반 작업이 있고, 체크/메모가 쉬운가?
- [ ] 대상자 목록이 있고, 발송/응답/지급 상태를 체크할 수 있는가?
- [ ] 실행 버튼이 작업(Task)에 붙어 있는가?
- [ ] 고위험 버튼은 2단계 확인 + 멱등(ref_id)이 있는가?

---

## 10) 결론

이 모듈은 “로그 시스템”이 아니라 **운영자가 매일 돌리는 ‘이벤트 운영계획(플레이북)’**입니다.

- 운영자가 보고 싶은 것은 action_code가 아니라 **오늘 할 일(작업)과 실행 버튼**입니다.
- 계획은 유연해야 하므로, 캠페인/플랜/작업 구조로 설계해야 합니다.
- 기존 구현물(Quick Logger/Routine/GH/Survey 패널, ref_id, 캐싱)은 **Task 기반 운영계획 UI로 재활용**하면 됩니다.
