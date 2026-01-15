# Ops 구현가이드 체크리스트 (API/DB/Frontend)

작성일: 2026-01-16
기준 문서: `도파민AA_Ops_Admin_UX_Plan.md`, `도파민AA_Ops_Frontend_Module_Design.md`, `도파민AA_Ops_Evaluation_System.md`, `2026_ops_plan_execution_result_schema.md`, `2026_core_economy_glossary_ko.md`, `2026_admin_game_config_schema_ko.md`, `2026_game_action_schema_ko.md`, `2026_notification_feed_schema_ko.md`, `2026_progression_schema_ko.md`

## API
- [x] Ops Plan 실행 API: `status_value="DONE"`일 때만 실행/기록, `execution_result` 응답 필드 노출.
- [x] `execution_result` 저장 위치 확정 및 API 일관화: `payload_json["execution_result"]` 기준으로 통일.
- [x] Target List 조회 API: planId 기반, 활성 리스트만 반환; `id`, `name`, `count_snapshot`, `is_processed` 포함.
- [x] ItemSelector 검색 API: 코드/표시명/카테고리(`CURRENCY|TICKET|ITEM`) 제공.
- [x] Ops 평가 지표 API: planId + `D1/D3/D7` 조회, summary + detail payload 반환.
- [x] 히스토리/타임라인 API: `executed_at`, `actor_admin_id`, `actor_name`, `kind`, `status` 포함.
- [x] 메시지 발송 메타 채널/대상 정보: `execution_result`에 `channel`, `audience`, `target_list_id` 포함.
- [x] 골든아워 토글 시 피드 메시지 발행(`GUERRILLA_DROP`) 연동 여부 결정.

## DB
- [x] `ops_plan_task.payload_json["execution_result"]` 스키마 준수 저장.
- [x] `ops_eval_metrics` 테이블 생성 및 `plan_id`, `eval_type`, `metrics_json`, `grade`, `created_at` 반영.
- [x] `ops_eval_metrics` 인덱스: `(plan_id, eval_type)`, `(created_at)`.
- [x] `ops_target_list` 메타 필드 유지: `count_snapshot`, `is_processed`.
- [x] 대량 지급 Chunk 처리, 멱등성(`executed_at`) 보장.
- [x] `OpsLog`/`UserActiveLog` 집계에 필요한 필드 정합성 확인.

## Frontend
- [x] `AdminOpsPlanPage` 모듈화: `OpsTaskList`, `OpsTaskCard`, `TaskEditor`, `ExecutionResultView`.
- [x] `ItemSelector`(검색/카테고리) + `TargetListSelector`(메타 뱃지) 구현.
- [x] `ActionModuleGrant/Message/Toggle` 폼 구성 및 검증(PII 차단, 전체 지급 확인).
- [x] `ExecutionResultView` 상태 UI: LOADING/SUCCESS/ERROR + 결과 영수증 배지.
- [x] 골든아워 상태 패널 및 배수 프리뷰 UI.
- [x] 타임라인 뷰 + 실행자 실명 표시.
- [x] 평가 리포트 탭: Summary Grade + D+1/3/7 상세 차트.
- [x] 모바일 레이아웃: Task 카드 접기/펼치기, 결과 영역 스택.

## 진행 기록
- 2026-01-16: `execution_result` 저장 위치를 `payload_json["execution_result"]`로 통일.
- 2026-01-16: 룰렛 슬롯 정의를 6개(0~5)로 통일.
- 2026-01-16: `MESSAGE_TEMPLATE/SURVEY_DM` 결과에 `channel`, `audience`, `target_list_id` 메타 포함 결정.
- 2026-01-16: 메시지 실행 결과에 채널/대상/리스트 ID 저장 및 실행 결과 UI 노출 반영.
- 2026-01-16: `ops_eval_metrics` 모델 및 인덱스 추가.
- 2026-01-16: Ops 평가 집계용 로그 필드 확인(OpsLogEntry + UserActivityEvent).
- 2026-01-16: `ExecutionResultView` 프론트엔드 컴포넌트 구현 및 `OpsPlanService` 테스트 업데이트 완료.
- 2026-01-16: `ops_eval_metrics` 테이블 생성 마이그레이션(20260116_0900) 추가 및 적용 완료.
- 2026-01-16: `OpsPlanAnalysisWorker` 서비스 구현 완료 (D+1 반응성/D+3 효과성 분석 로직 적용).
- 2026-01-16: Ops Plan 프론트 모듈화/선택기/타임라인/리포트/모바일 접기 완료.
- 2026-01-16: 실행 결과 뷰 타깃 리스트 ID 파싱 보강 및 상태 문구 정리, 탭별 로딩 훅 순서 정리.
- 2026-01-16: 프론트엔드 Lint(TS Ignore → Expect Error) 수정 및 AdminOpsPlanPage 구문 오류 수정.
- 2026-01-16: Ops Plan Backend API(Items, TargetLists, EvalMetrics, Timeline) 전체 구현 및 `admin_feed_config` 의존성 수정 완료.
- 2026-01-16: 골든아워(Guerrilla Drop) 실행 시 `FeedService` 연동하여 퍼블릭 피드 자동 발행 로직 추가.
- 2026-01-16: 로컬 도커 컨테이너 전체 재빌드 및 정상 구동 확인 (Frontend Build Pass).
- 2026-01-16: 도파민/사운드 시스템 전면 개편.
  - 사운드 자산 교체: 룰렛/복권/주사위/Vault에 사용자 제공 고품질 SFX 적용 (`Ball_Drop`, `Small_Win`, `Big_Win`, `Dice_Reveal`, `Vault_Jingle` 등).
  - 로직 개선: 룰렛 회전음 뮤트, 결과 화면 동기화. 주사위/복권 결과 공개 시점 사운드 매핑.
  - Vault UX: `AnimatedNumber` 초기화 버그 수정(Skip 방지) 및 애니메이션 시작 시 사운드 트리거(`onAnimationStart`) 추가.
