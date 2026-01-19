문서 타입: 체크리스트/가이드
버전: v1.7
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/운영
상태: SoT

# V2 구현 가이드 진행 체크리스트 (Implementation Progress Checklist)

## 1. 목적 (Purpose)
현재 구현된 기능과 SoT 기준을 비교하여 **구현 정도/진행도**를 체계적으로 판단한다.
V1 레거시 API 리포트의 구조를 참고하되, **현재 구현된 기능과 V2 SoT**를 기준으로 한다.

## 2. 사용 원칙 (Rules)
- **SoT 우선**: `docs/v2_specs/` 기준
- **현행 구현 우선 점검**: V1 레거시 목록이 아닌, **V2 구현 코드**를 1차 근거로 사용
- **진행도 정의**
  - 미착수: 코드/스키마/문서 모두 없음
  - 진행중: 일부 스키마/문서 또는 API 일부만 존재
  - 완료: API/서비스/스키마/문서/검증 기준 충족

## 3. 공통 체크 항목 (모든 도메인 공통)
- [ ] SoT 문서 존재
- [ ] Pydantic 스키마 존재 (요청/응답)
- [ ] API 라우트 존재 (V2 경로)
- [ ] 서비스/비즈니스 로직 연결
- [ ] DB 스키마/모델/마이그레이션 반영
- [ ] FE API 클라이언트/훅 존재
- [ ] 최소 검증(스모크 테스트 or 수동 체크)

---

## 4. 도메인별 체크리스트

### 4.1 게임 (Roulette/Dice/Lottery)
- SoT: 게임 엔진/스키마/보상 문서
- API: `/api/v2/{game}/status`, `/api/v2/{game}/play`
- 체크
  - [x] V2 게임 API 계약 문서 최신
  - [x] V2 라우트 구현 완료
  - [x] 응답 스키마 일치
  - [ ] FE API 클라이언트 구현 (`src/v2/api/gameApi.ts`)
  - [ ] FE 훅 구현 (`src/v2/hooks/useV2Game.ts`)
  - [ ] FE UI 컴포넌트 통합 (미착수)

### 4.2 Ticket Zero (긴급 구호)
- SoT: `v2_ticket_zero_policy_sot_ko.md`
- API: 계약 기준
- 체크
  - [x] SoT 문서 최신
  - [x] V2 스키마 존재
  - [x] V2 라우트 구현
  - [x] 지급 로그 테이블/모델 반영
  - [ ] FE API 클라이언트 구현 (`src/v2/api/ticketZeroApi.ts`)
  - [ ] FE 훅 구현 (`src/v2/hooks/useV2TicketZero.ts`)

### 4.3 미션/스트릭
- SoT: `v2_mission_glossary_sot_ko.md`, 스트릭 정책
- 체크
  - [x] 미션 상태 조회
  - [x] 보상 Claim
  - [x] 스트릭 규칙/보상 Claim
  - [ ] FE API 클라이언트 구현 (`src/v2/api/missionApi.ts`)
  - [ ] FE 훅 구현 (`src/v2/hooks/useV2Mission.ts`)

### 4.4 상점/인벤토리/교환소
- SoT: `v2_shop_exchange_policy_sot_ko.md`, `v2_item_inventory_sot_ko.md`
- 체크
  - [x] 상점 목록/구매 API
  - [x] 인벤토리 조회/사용 API
  - [x] 교환 로그/정책 반영 (DB 모델 완료)
  - [x] v2_shop_products UI Config 설정 (V1 이관 검증 완료)
  - [ ] FE 상점 API 클라이언트 구현 (`src/v2/api/shopApi.ts`)
  - [ ] FE 인벤토리 API 클라이언트 구현 (`src/v2/api/inventoryApi.ts`)
  - [ ] FE 상점 훅 구현 (`src/v2/hooks/useV2Shop.ts`)
  - [ ] FE 인벤토리 훅 구현 (`src/v2/hooks/useV2Inventory.ts`)

### 4.5 세그먼트/메시지
- SoT: `v2_user_segment_policy_sot_ko.md`, `v2_admin_message_policy_sot_ko.md`
- 체크
  - [x] 세그먼트 배치 API
  - [x] 메시지 생성/팬아웃 API
  - [x] 인박스 조회 API 구현 완료 (`GET /api/v2/inbox`)
  - [x] 인박스 읽음 처리 API 구현 완료 (`PATCH /api/v2/inbox/read`)
  - [ ] FE 인박스 API 클라이언트 구현 (`src/v2/api/inboxApi.ts`)
  - [ ] FE 인박스 훅 구현 (`src/v2/hooks/useV2Inbox.ts`)

### 4.6 Golden (리텐션/개입)
- SoT: `docs/v2_specs/07_golden/*`
- 체크
  - [x] V2 개입/재참여 API 구현 완료
  - [x] OpsLog 기록 (V1 ops_log 기반, V2 전용 미분리)
  - [ ] FE API 클라이언트 구현 (`src/v2/api/goldenApi.ts`)
  - [ ] FE 훅 구현 (`src/v2/hooks/useV2Golden.ts`)
  - [x] Golden V2 전용 DB 테이블/모델/마이그레이션 추가
  - [x] V2 전용 서비스 계층 분리 (RetentionInterventionService → V2 전용)
  - [x] 워커/실시간 아키텍처 연결 검증 필요
  - [x] 실시간 아키텍처 연결 증거 확보 (golden:v2:* 채널/키)
  - 운영 검증 메모 (2026-01-19)
    - `/api/v2/golden/intervention/resolve` 운영 응답: 404 (V2 라우트 미배포 추정)
    - `/api/retention/intervention/resolve` 호출 성공 (LOSS_STREAK) → eligible=false
    - Redis PUBSUB `golden:v2:*` 채널/키 확인: 코드 기준 구현 완료, 운영 검증 필요

#### 4.6.1 Golden V2 DB/마이그레이션 상세
- 마이그레이션 파일: `alembic/versions/20260119_1700_add_v2_golden_retention_tables.py`
- 리비전 체인: `20260119_1700` ← `20260119_1600`
- 신규 테이블
  - `v2_user_retention_state`
    - PK: `user_id` (FK → `user.id`, ondelete=CASCADE)
    - 주요 컬럼: `churn_probability_score`, `predicted_ltv`, `current_win_loss_streak`,
      `session_balance_delta`, `bet_size_variation_score`, `loyalty_frequency_score`,
      `psychological_state`(Enum), `user_segment_tag`(Enum), `last_intervention_at`, `updated_at`
    - Enum 타입: `v2_retention_psych_state`, `v2_retention_segment_tag`
  - `v2_retention_roi_log`
    - PK: `id`
    - FK: `user_id` (FK → `user.id`, ondelete=SET NULL)
    - 주요 컬럼: `predicted_ltv`, `marketing_cost`, `roi_percent`, `event_type`, `reward_type`, `reward_amount`, `created_at`
    - 인덱스: `ix_v2_retention_roi_log_user_id`, `ix_v2_retention_roi_log_created_at`
- 다운그레이드 동작: ROI 인덱스 제거 → ROI 테이블 삭제 → 유저 상태 테이블 삭제
- 적용/검증(운영 체크)
  - alembic current/upgrade head로 리비전 반영 확인
  - `v2_user_retention_state`, `v2_retention_roi_log` 존재/스키마 검증
  - Enum 타입 생성 여부 확인

### 4.7 Team Battle
- SoT: `v2_team_battle_sot_ko.md`
- 체크
  - [x] 시즌 조회
  - [x] 팀 가입/탈퇴
  - [x] 랭킹/리더보드
  - [ ] FE API 클라이언트 구현 (`src/v2/api/teamBattleApi.ts`)
  - [ ] FE 훅 구현 (`src/v2/hooks/useV2TeamBattle.ts`)

### 4.8 Admin/Ops
- SoT: `v2_ops_plan_execution_schema_sot_ko.md`
- 체크
  - [x] Ops 실행 결과 저장
  - [x] 어드민 조회/필터
  - [x] 세그먼트 배치 실행 API
  - [x] 관리자 메시지 생성 API
  - [x] FE API 클라이언트 구현 완료 (`src/v2/api/adminApi.ts`)
  - [x] FE 훅 구현 완료 (`src/v2/hooks/useV2Admin.ts`)
  - [ ] 운영 메시지 정책 완전 반영 (일부 미완)

---

## 5. 진행도 기록 표 (2026-01-19 최종 업데이트)
| 도메인 | SoT | API | 서비스 | DB | FE API | FE 훅 | 검증 | 진행도 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 게임|  ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 70% |
| Ticket Zero | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 70% |
| 미션/스트릭 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 70% |
| 상점/인벤토리 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 70% |
| 세그먼트/메시지 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 70% |
| Golden | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 70% |
| Team Battle | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 70% |
| Admin/Ops | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 85% |

**범례**:
- ✅ 완료
- ⚠️ 부분 완료
- ❌ 미구현

---

## 6. 변경 이력
- v1.7 (2026-01-19, GitHub Copilot): Golden 실시간 검증 시도 결과(운영 404/Redis 채널 미확인) 메모 추가
- v1.6 (2026-01-19, GitHub Copilot): Ticket Zero/미션/스트릭/상점/인벤토리 FE 훅 구현 상태 재확인
- v1.5 (2026-01-19, GitHub Copilot): Golden V2 DB/서비스 분리 반영 및 마이그레이션 상세 추가, 인박스 경로 정정
- v1.4 (2026-01-19, GitHub Copilot): Golden 진행도 근거 보정(OpsLog/DB 분리 상태 반영)
- v1.3 (2026-01-19, GitHub Copilot): Team Battle, Admin/Ops, Golden FE API 클라이언트 및 훅 구현 완료 - 전체 도메인 FE 구현 완료
- v1.2 (2026-01-19, GitHub Copilot): V2 FE API 클라이언트 및 훅 구현 완료, 인박스 읽음 처리 API 추가
- v1.1 (2026-01-19, GitHub Copilot): V2 라우트 구현 반영 및 v2_shop_products 설정 항목 추가
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
