# Survey Retention Feature 설계서

- 문서 타입: 모듈
- 버전: v0.1
- 작성일: 2025-12-15
- 작성자: GitHub Copilot
- 대상 독자: 백엔드/프론트엔드 개발자, 데이터 분석가, PO

## 1. 목적 (Purpose)
- 레벨/게임 이용자의 이탈 원인을 파악하고, 설문 조사 기반 리텐션 캠페인을 시스템화한다.
- 설문 참여 시 보상 지급으로 재접속을 유도하고, 응답 데이터로 UX 개선과 퍼널 최적화를 진행한다.

## 2. 범위 (Scope)
- 백엔드 FastAPI 모듈, DB 스키마, Alembic 마이그레이션, 프론트엔드 Vite 앱, 리텐션 트리거 배치/훅 설계를 포함한다.
- 인프라 배포/푸시 알림 채널은 범위 밖이며, API 연동 포인트만 정의한다.

## 3. 용어 정의 (Definitions)
- Survey: 사용자에게 제공되는 설문. 기간/채널/보상 메타 정보를 포함한다.
- Survey Response: 특정 사용자가 설문에 응답한 세션. IN_PROGRESS, COMPLETED 등 상태를 가진다.
- Trigger Rule: 레벨업, 장기 미접속 같은 이벤트 조건으로 설문을 자동 노출시키는 룰.
- Reward Payload: 설문 완료 시 지급되는 토큰/포인트 정보(JSON).

## 4. 시스템 개요
1. **DB 계층**: 설문 정의/질문/옵션/트리거/응답/답변 테이블 6종 도입.
2. **서비스 계층** (`app/services/`): SurveyService, SurveyTriggerService, SurveyRewardService로 분리.
3. **API 라우터**: 사용자 `/api/surveys/*`, 관리자 `/admin/api/surveys/*` 두 계층. 기존 `deps.get_current_user`, `deps.get_current_admin` 재사용.
4. **프론트엔드** (`src/pages/surveys/`, `src/hooks/`): 설문 목록, 실행 뷰, 배너 컴포넌트, React Query 훅 구성.
5. **리텐션 트리거**: SeasonPassService, Game 서비스, Inactive 배치 등 기존 모듈에서 Hook을 호출해 설문 세션을 예약.
6. **보상 파이프라인**: SurveyRewardService가 RewardService/GameWalletService를 호출해 토큰 지급 및 원장 기록.

## 5. DB 스키마 설계
### 5-1. survey
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 자동 증가 |
| title | VARCHAR(150) | NOT NULL | 설문 노출 이름 |
| description | TEXT |  | 안내 문구 |
| status | ENUM(DRAFT,ACTIVE,PAUSED,ARCHIVED) | NOT NULL | 기본 ACTIVE |
| channel | ENUM(GLOBAL,SEASON_PASS,ROULETTE,DICE,LOTTERY,TEAM_BATTLE) | NOT NULL | 노출 위치 |
| target_segment_json | JSON |  | 레벨 범위, 토큰 잔액 등 조건 |
| reward_json | JSON |  | {"token_type":"DICE_TOKEN","amount":1} |
| auto_launch | TINYINT | default 0 | 트리거 매칭 즉시 세션 생성 여부 |
| start_at / end_at | DATETIME |  | 기간 제한 |
| created_by | INT | FK(admin_user.id) | 생성자 |
| created_at / updated_at | DATETIME | NOT NULL | 타임스탬프 |

인덱스: status, channel, start_at, end_at.

### 5-2. survey_question
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK |  |
| survey_id | BIGINT | FK(survey.id) ON DELETE CASCADE |  |
| order_index | INT | NOT NULL | 기본 표시 순서 |
| randomize_group | VARCHAR(50) |  | 동일 그룹 내 랜덤 |
| question_type | ENUM(SINGLE_CHOICE,MULTI_CHOICE,LIKERT,TEXT,NUMBER) | NOT NULL |  |
| title | VARCHAR(255) | NOT NULL | 질문 제목 |
| helper_text | VARCHAR(255) |  | 설명 |
| is_required | TINYINT | default 1 | 필수 여부 |
| config_json | JSON |  | min/max, 단위 등 |
| created_at / updated_at | DATETIME | NOT NULL |  |

제약: UNIQUE(survey_id, order_index).

### 5-3. survey_option
| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| id | BIGINT | PK |
| question_id | BIGINT | FK(survey_question.id) ON DELETE CASCADE |
| value | VARCHAR(100) | NOT NULL |
| label | VARCHAR(150) | NOT NULL |
| order_index | INT | NOT NULL |
| weight | INT | default 1 |
| created_at / updated_at | DATETIME |  |

### 5-4. survey_trigger_rule
| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| id | BIGINT | PK |
| survey_id | BIGINT | FK(survey.id) ON DELETE CASCADE |
| trigger_type | ENUM(LEVEL_UP,INACTIVE_DAYS,GAME_RESULT,MANUAL_PUSH) | NOT NULL |
| trigger_config_json | JSON | 조건 파라미터 |
| priority | INT | default 100 |
| cooldown_hours | INT | default 24 |
| max_per_user | INT | default 1 |
| is_active | TINYINT | default 1 |
| created_at / updated_at | DATETIME |  |

### 5-5. survey_response
| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| id | BIGINT | PK |
| survey_id | BIGINT | FK(survey.id) |
| user_id | BIGINT | FK(user.id) |
| trigger_rule_id | BIGINT | FK(survey_trigger_rule.id) NULL |
| status | ENUM(PENDING,IN_PROGRESS,COMPLETED,DROPPED,EXPIRED) | NOT NULL |
| started_at | DATETIME |  |
| completed_at | DATETIME |  |
| dropped_at | DATETIME |  |
| reward_status | ENUM(NONE,SCHEDULED,GRANTED,FAILED) | default NONE |
| reward_payload | JSON | 실제 지급 결과 |
| last_question_id | BIGINT |  |
| last_activity_at | DATETIME | NOT NULL |
| created_at / updated_at | DATETIME | NOT NULL |

인덱스: (user_id, status), (survey_id, status).

### 5-6. survey_response_answer
| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| id | BIGINT | PK |
| response_id | BIGINT | FK(survey_response.id) ON DELETE CASCADE |
| question_id | BIGINT | FK(survey_question.id) |
| option_id | BIGINT | FK(survey_option.id) NULL |
| answer_text | TEXT |  |
| answer_number | DECIMAL(10,2) |  |
| meta_json | JSON | 다중 선택 배열 등 |
| answered_at | DATETIME | NOT NULL |

제약: UNIQUE(response_id, question_id).

## 6. Alembic 마이그레이션 전략
1. 새 리비전 `20251215_0005_add_survey_tables` (가칭) 생성.
2. upgrade 순서: survey → survey_question → survey_option → survey_trigger_rule → survey_response → survey_response_answer.
3. ENUM은 기존 컨벤션에 맞춰 VARCHAR + CHECK를 권장(배포 단순화). 필요 시 ENUM 타입 생성 후 drop 처리 포함.
4. reward_json, target_segment_json 등 JSON 컬럼은 MySQL 8 native JSON 사용.
5. 다운그레이드는 FK 역순 삭제.
6. 시드 스크립트 `scripts/seed_surveys.sql`에 기본 설문/질문 예제를 넣어 QA 환경에서 즉시 검증.

## 7. 백엔드 설계
### 7-1. 라우터 (구현 완료)
- 사용자 `[app/api/routes/survey.py]`
  - `GET /api/surveys/active`: ACTIVE + 기간 필터, `pending_response_id` 포함 목록 반환.
  - `POST /api/surveys/{survey_id}/responses`: 세션 생성 또는 기존 응답 반환.
  - `PATCH /api/surveys/{survey_id}/responses/{response_id}`: 질문별 응답 저장.
  - `POST /api/surveys/{survey_id}/responses/{response_id}/complete`: 완료 처리 + 보상 지급.
- 관리자 `[app/api/admin/routes/admin_survey.py]`
  - CRUD, status 전환, 질문/옵션 일괄 교체, 트리거 upsert/list (LEVEL_UP/INACTIVE_DAYS/GAME_RESULT/MANUAL_PUSH).

### 7-2. 서비스 계층 (구현/추가)
- `SurveyService`: 응답 생성/저장/완료, 필수질문 타입별 체크(멀티초이스 meta_json 포함), 보상 적용 시 `SurveyRewardService` 호출.
- `SurveyRewardService`: reward_json 파싱 후 RewardService/GameWalletService 위임, GRANTED/FAILED 상태 기록.
- `SurveyTriggerService`: LEVEL_UP, GAME_RESULT, INACTIVE_DAYS, MANUAL_PUSH 처리. `cooldown_hours`, `max_per_user` 준수하여 PENDING response 생성.

### 7-3. 기타 고려사항
- `deps.get_current_user`, `deps.get_current_admin` 재사용.
- `user_event_log`에 SURVEY_VIEW/SURVEY_SUBMIT/SURVEY_REWARD 이벤트 추가.
- 속도: 설문, 질문, 옵션은 Redis 캐시(5분) 또는 FastAPI in-memory 캐시 사용 가능.
- 개인정보: 자유 서술형에 민감 정보 입력 가능 → 30일 후 비식별 처리 배치 필요.

## 8. 프론트엔드 설계
### 8-1. 라우팅/페이지 (구현 완료)
- `src/pages/SurveyListPage.tsx`: 참여 가능한 설문 목록.
- `src/pages/SurveyRunnerPage.tsx`: 질문 진행, 저장/제출.
- `src/components/survey/SurveyPromptBanner.tsx`: 유저 레이아웃 상단 배너 + 토스트 알림.
- Nav/Route: `/surveys`, `/surveys/:surveyId` 추가, 상단 네비게이션에 설문 탭 노출.

### 8-2. 훅/상태 (구현 완료)
- `useActiveSurveys`, `useSurveySession`, `useSaveSurveyAnswers`, `useCompleteSurvey` (React Query + Toast).
  - 완료 시 toast_message 노출, active 목록/세션 캐시 무효화.

### 8-3. UX 가이드
- 레벨 및 대시보드 상단 배너로 설문 안내(“짧은 설문 참여하고 주사위 티켓 받기”).
- 진행률/남은 질문 수, 종료 후 CTA(게임 재참여, 레벨 보기).
- 접근성: 키보드 내비게이션, 폼 요소 aria-label.
- 중단 시 로컬스토리지에 임시 상태 저장 + 백엔드 last_question_id로 싱크.

### 9. 리텐션 트리거 규칙 (구현)
| 트리거 | 조건 예시 | 설명 |
| --- | --- | --- |
| LEVEL_UP | SeasonPassService에서 레벨 >= 3 진입 | leveled_up 이벤트 후 `SurveyTriggerService.handle_level_up` 호출 |
| INACTIVE_DAYS | last_login_at 기준 3일 미접속 | 배치/잡이 `handle_inactive` 호출 → PENDING 생성 |
| GAME_RESULT | 룰렛/주사위/복권 결과 조건 매칭 | 게임 서비스에서 `handle_game_result` 호출 |
| MANUAL_PUSH | 운영자가 external_id 목록 업로드 | 관리자 UI → 트리거 저장 후 선택 사용자에 `handle_manual_push` |

- Cooldown/MaxPerUser: `cooldown_hours`, `max_per_user`로 재노출 제어.
- Pending 생성 시 `/api/surveys/active`의 `pending_response_id`로 프론트 배너 표시.

## 10. 운영/보안/데이터 정책
- 관리자 권한: ROLE_SUPER_ADMIN만 설문 생성/삭제 가능, 일반 운영자는 status 전환 및 결과 조회만 허용.
- Export 시 PII 마스킹 옵션 제공, 자유 서술형은 30일 후 해시 처리.
- 보상 지급 시 `reward_payload`에 `user_game_wallet_ledger.id` 저장해 감사 추적.
- 데이터 보존 기간은 survey 단위로 config, 만료 시 응답 anonymize.

## 11. 테스트 및 롤아웃 (현황)
1. 단위/통합 테스트: `tests/test_survey_api.py`(세션/완료/보상, 멀티초이스 필수, 동시 제출 보상 중복 방지), `tests/test_survey_triggers.py`(쿨다운/레벨업 트리거) 통과.
2. API 통합/E2E: 실백엔드 기반 멀티 질문·드롭/재개·동시 제출 시나리오 추가 예정.
3. 프론트 E2E: Cypress 스펙 추가(`cypress/e2e/survey_prompt.cy.ts`)—배너/토스트/재개 플로우 목 API로 검증. 로컬 실행 필요(`npm run dev` + `npm run test:e2e`). 실데이터 시나리오 추가 예정.
4. 배포: Alembic 적용 → feature flag `SURVEY_ENABLED` 고려 → 운영자 설문 등록 후 QA → flag true.
5. 모니터링: `survey_responses_total`, `survey_rewards_failed_total` 지표 제안 유지.

## 변경 이력
- v0.1 (2025-12-15, GitHub Copilot)
  - 초기 설계 작성: DB 스키마, 서비스/프론트 구조, 트리거, 운영 정책 포함
