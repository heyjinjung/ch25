# Ops Admin UX 상세 플로우/와이어프레임 가이드

작성일: 2026-01-16
범위: `AdminOpsPlanPage` 중심의 Ops Plan 작성/실행/평가 UX
연계 문서: `도파민AA_Ops_Admin_UX_Plan.md`, `도파민AA_Ops_Frontend_Module_Design.md`, `2026_ops_plan_execution_result_schema.md`, `도파민AA_Ops_Evaluation_System.md`

---

## 1. 정보 구조(IA)
- Plan 목록 -> Plan 상세(Task Builder) -> 실행 결과/타임라인 -> 평가 리포트
- Plan 상세 내 탭: `Task Builder`, `Execution`, `Report`
- 공통 패널: 현재 골든아워 상태, 마지막 실행자, 최근 실패 알림

---

## 2. 사용자 플로우

### 2.1 Plan 작성 및 액션 구성
1. Plan 상세 진입 -> Task 리스트 확인
2. `[+ 액션 추가]` 클릭 -> 모듈 타입 선택(Grant/Message/Toggle)
3. 모듈 폼 입력(아이템/타겟/채널/배수 등)
4. 안전장치 확인(전체 유저/PII/고액)
5. 저장 후 Task 카드 생성

### 2.2 실행 및 피드백
1. Task 카드에서 `[Execute]` 클릭
2. 프리플라이트 모달 확인(영향 범위/총 지급액)
3. 실행 중 LOADING 상태
4. 완료 시 `ExecutionResultView`로 결과 영수증 노출
5. 실패 시 Error 카드 + 재시도 버튼

### 2.3 히스토리 및 평가
1. 타임라인 뷰에서 시간순 이력 확인
2. 평가 리포트 탭에서 D+1/3/7 지표 확인
3. Grade/AI 코멘트 확인 후 다음 Plan 조정

---

## 3. 화면 와이어프레임(텍스트)

### 3.1 Plan 상세 - Task Builder
```
+------------------------------------------------------------------+
| Plan Header: Title | Date | Status | [Run All] [New Task]         |
+------------------------------------------------------------------+
| Left: Task List                          | Right: Task Editor     |
| - Task Card (type/time/status)           | - Module Selector      |
| - Task Card                              | - Form Fields          |
| - Task Card                              | - Safety/Preview       |
|                                          | - Save/Execute          |
+------------------------------------------------------------------+
| Bottom: Result Receipt (collapsible) / Timeline                  |
+------------------------------------------------------------------+
```

### 3.2 Task 카드(실행 결과 포함)
```
+-------------------------------------------------------------+
| [Type Badge] Task Name      Time   Status   [Execute]        |
| Target: #52 Window Shopper  Items: DIAMOND x 1              |
| Result (Success): 2,450 users | 12,400,000 points           |
+-------------------------------------------------------------+
```

### 3.3 타임라인 뷰
```
+-------------------------------------------------------------+
| 09:00 Ops_Lead (김운영) | 보상 지급                          |
| 13:00 Ops_Lead (김운영) | 골든아워 ON (2.5x)                 |
| 15:00 Ops_Assist        | 메시지 발송 완료                   |
+-------------------------------------------------------------+
```

### 3.4 평가 리포트 탭
```
+------------------------------------------------------------------+
| Grade: A | AI Comment: "D+3 리텐션 +15%p, 인플레 2%"             |
+------------------------------------------------------------------+
| D+1 (Response)   | D+3 (Effectiveness) | D+7 (Soundness)          |
| Claim Rate 85%   | Retention Lift 15%  | Net Change +200k        |
+------------------------------------------------------------------+
```

---

## 4. 데이터 매핑 가이드

| UI 영역 | 데이터 소스 | 필드 |
| --- | --- | --- |
| Task 카드 요약 | `ops_plan_task` | `type`, `status`, `payload_json` |
| 결과 영수증 | `payload_json["execution_result"]` | `kind`, `granted_users`, `sent_count`, `items`, `multiplier`, `channel`, `audience`, `target_list_id` |
| 타임라인 | `ops_plan_task` + admin info | `executed_at`, `actor_admin_id`, `actor_name` |
| 평가 리포트 | `ops_eval_metrics` | `metrics_json`, `grade`, `eval_type` |

---

## 5. 안전장치/상태 UX
- 전체 유저 지급 시 2단계 확인 모달(금액/대상 강조).
- PII 탐지 시 메시지 발송 버튼 비활성화 + 경고 문구 표시.
- 실행 실패 시 `execution_error` 표준화 노출(가능한 액션 모두).
- 골든아워 상태는 항상 상단 고정 패널로 노출.

---

## 6. 반응형 기준
- 데스크톱: 좌/우 2열 고정(리스트/에디터), 결과는 하단 패널.
- 모바일: Task 카드와 Editor를 스택형으로 전환, 결과 영역은 카드 하단 펼침.
