# 백엔드 설계 검증 체크리스트

- 문서 타입: 검증/리뷰
- 버전: v1.1
- 작성일: 2025-12-10
- 작성자: 시스템 검증팀
- 대상 독자: 백엔드 리드/리뷰어, QA, 아키텍트

## 1. 목적 (Purpose)
- 기존 설계 문서에 정의된 규칙과 제약이 일관되게 반영되어 있는지 점검하기 위한 백엔드 검증 기준을 제공한다.
- 운영 중 오류를 예방하기 위해 미비점/추가 확인이 필요한 항목을 명확히 표시한다.

## 2. 범위 (Scope)
- docs/01~06에 수록된 백엔드 설계(공통 규칙, DB 테이블, 서비스/게임 모듈, 운영 기준) 전반을 대상으로 한다.
- 프론트엔드 UX/디자인, 인프라 세부 튜닝, 테스트 코드 구현은 범위에 포함하지 않는다.

## 3. 용어 정의 (Definitions)
- KST 기준: 모든 날짜·일일 제한 계산은 Asia/Seoul 타임존 기준으로 수행한다.
- Today Feature: feature_schedule 상 오늘 날짜에 설정된 feature_type(ROULETTE/DICE/LOTTERY/RANKING/SEASON_PASS/NONE).
- Validation Status: ✅ 충족, ⚠️ 보완 필요, ❌ 미충족으로 표시하며 근거/조치 메모를 함께 적는다.

## 4. 본문 – 검증 결과 (2025-12-06 기준)
### 신규 사항 (2025-12-07)
- ⚠️ Alembic migration `20251207_0002_feature_config_and_seed` 작성됨: feature_config 컬럼 변경(config→config_json, title, page_path 추가) + demo 데이터 seed 포함. 대상 DB에 이미 수동 변경이 반영된 경우 중복 컬럼 오류 우려가 있으니 `alembic upgrade head`는 깨끗한 스키마에서 적용하거나 DDL을 조정 필요. 적용 여부 미확인 상태.

### 4-1. 공통 규칙/제약
- ✅ KST 기준 적용이 개요/아키텍처/공통 모듈 문서에 명시됨. (docs/01_overview/01_overview_system_v1.0.md, docs/02_architecture/02_architecture_backend_v1.0.md, docs/05_modules/05_module_game_common_v1.0.md)
- ✅ feature_schedule은 UNIQUE(date)로 하루 하나의 feature_type만 허용하도록 정의됨. (docs/04_db/04_db_core_tables_v1.0.md)
- ✅ 동시에 활성 시즌이 2개 이상일 때 `NO_ACTIVE_SEASON_CONFLICT`로 에러 처리하도록 문서화 완료. (docs/05_modules/05_module_backend_services_v1.0.md, docs/03_api/03_api_overview_v1.0.md)

### 4-2. DB/모델 제약
- ✅ season_pass_progress UNIQUE(user_id, season_id) 정의. (docs/04_db/04_db_core_tables_v1.0.md)
- ✅ season_pass_stamp_log UNIQUE(user_id, season_id, date) 정의. (docs/04_db/04_db_core_tables_v1.0.md)
- ✅ season_pass_reward_log UNIQUE(user_id, season_id, level) 정의. (docs/04_db/04_db_core_tables_v1.0.md)
- ✅ season_pass_stamp_log / season_pass_reward_log 이 progress_id FK로 season_pass_progress와 연결됨(코드/문서 일치 확인 완료, 테스트 통과).
- ✅ roulette_segment UNIQUE(config_id, slot_index) + slot_index 0~5 고정 명시. (docs/04_db/04_db_core_tables_v1.0.md)
- ✅ ranking_daily UNIQUE(date, rank) 정의. (docs/04_db/04_db_core_tables_v1.0.md)
- ✅ FK 관계는 각 테이블 설명에 season_id/user_id/config_id/prize_id 등을 통해 명시되어 모순 없음.
- ⚠️ 무제한(max_daily=0) 정책: remaining=0 표기로 무제한 처리하며 API/프론트 문구 반영 완료. 에러 카탈로그/FE 안내 최종 검수 남음(⚠️ 유지).

### 4-3. Season Pass 로직
- ✅ add_stamp 단계(중복 체크 → XP 계산 → 레벨업 → 보상 지급 → 로그)가 순서대로 기술됨. (docs/05_modules/05_module_season_pass_service_v1.0.md)
- ✅ 하루 1도장 정책이 stamp_log UNIQUE와 로직 설명으로 명확히 표현됨.
- ✅ 다단계 레벨업 시 신규 달성 레벨 중 auto_claim=1 보상을 지급한다고 명시되어 중간 레벨 보상 누락 우려가 없음.
- ✅ reward_log UNIQUE로 보상 중복 방지 구조 명시.

### 4-4. Feature Schedule + 게임 연동
- ✅ FeatureService 동작 규칙을 "0개 → feature_type=NONE, 2개 이상 → INVALID_FEATURE_SCHEDULE"로 명시하고 공통 에러 목록에 반영. (docs/05_modules/05_module_backend_services_v1.0.md, docs/03_api/03_api_overview_v1.0.md)
- ✅ Roulette/Dice/Lottery/Ranking 서비스 책임에 “오늘 feature_type 일치 여부 확인 후 차단”이 포함됨. (docs/05_modules/05_module_roulette_service_v1.0.md, docs/05_modules/05_module_dice_service_v1.0.md, docs/05_modules/05_module_lottery_service_v1.0.md, docs/05_modules/05_module_ranking_service_v1.0.md)

### 4-5. 게임 모듈별 검증
- ✅ 룰렛: config당 slot_index 0~5 총 6칸, Σweight>0 검증, max_daily_spins 정책이 정의됨. (docs/04_db/04_db_core_tables_v1.0.md, docs/05_modules/05_module_roulette_service_v1.0.md)
- ✅ 주사위: 유저/딜러 2개 주사위 합계 비교 구조, 결과별 보상 매핑, max_daily_plays 정의. (docs/04_db/04_db_core_tables_v1.0.md, docs/05_modules/05_module_dice_service_v1.0.md)
- ✅ 복권: lottery_prize에서 label/reward/weight/stock/is_active 관리자 편집, 추첨 대상 필터와 Σweight>0 규칙 명시. (docs/04_db/04_db_core_tables_v1.0.md, docs/05_modules/05_module_lottery_service_v1.0.md)
- ✅ 랭킹: ranking_daily 관리자가 직접 입력, UNIQUE(date, rank), display_name 노출, 조회 전용 설계 명시. (docs/04_db/04_db_core_tables_v1.0.md, docs/05_modules/05_module_ranking_service_v1.0.md)

### 4-6. Admin → Runtime 안전성
- ✅ 공통 에러 코드 테이블과 모듈별 에러 코드가 문서화됨(`INVALID_ROULETTE_CONFIG`, `INVALID_LOTTERY_CONFIG`, `DAILY_LIMIT_REACHED`, `NO_FEATURE_TODAY` 등). (docs/03_api/03_api_overview_v1.0.md, docs/05_modules/05_module_game_common_v1.0.md, 각 게임 모듈 문서)
- ✅ 시즌패스 에러 코드 `REWARD_ALREADY_CLAIMED`, `AUTO_CLAIM_LEVEL`을 API/서비스/문서에 포함하여 보상 중복/자동지급 레벨을 명시.

### 4-7. 유저 시나리오
- ✅ “룰렛 Day + 시즌패스 진행”과 “시즌 종료 후 호출” 시나리오를 운영/QA용으로 문서화하여 테스트 포인트와 연결. (docs/06_ops/06_ops_runbook_v1.0.md)
- ✅ 통합 테스트 커버리지 반영: roulette/dice/lottery play 흐름, 시즌패스 다중 레벨업·수동 클레임·무활성 시즌 호출, admin ranking 업로드 성공/충돌 케이스를 포함.

## 5. 예시
- 12/24 ROULETTE Day 시나리오(요약): /api/today-feature → roulette/status → roulette/play(RewardService 보상 + add_stamp) → season-pass/status 순으로 호출하여 XP/레벨 변동을 확인하는 플로우를 기준으로 테스트 케이스를 구성한다.

## 변경 이력
- v1.1 (2025-12-10, 시스템 검증팀)
  - 활성 시즌 중복, feature 스케줄 오류, 공통 에러 코드, 일일 시나리오 보완 후 상태 업데이트
- v1.0 (2025-12-09, 시스템 검증팀)
  - 검증 체크리스트 신설 및 현 설계 문서 기준 충족/보완 항목 표시
