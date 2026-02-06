# Learned Context Summary: Mission Domain (1·2·3차 통합)

[최종 검토일: 2026-01-26]
정책 최신화 필요 여부: 🟢 (2026-01-26 기준)

## 0. 목적 / 사용법
- 이 문서는 미션/스트릭 도메인의 SoT 문서, API 계약, 운영(OPS) 이슈/해결, 디자인(라우팅) 근거를 **1차+2차+3차로 누적 통합**한 요약입니다.
- 목표는 “SoT ↔ 코드 ↔ 운영 ↔ DB ↔ FE”의 1:1 매핑표([docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/mission.md](../../00_sot_meta/00_A_sot_code_ops_chk/mission.md))를 지속적으로 자동 검증(diff)할 수 있게, 체크포인트를 남기는 것입니다.

---

## 1. SoT 체계 (우선순위)
- 최상위 계약/공통 규칙: [docs/v2_specs/03_api/v2_api_contract_sot_ko.md](../../03_api/v2_api_contract_sot_ko.md)
  - V2 API 프리픽스: `/api/v2/` 고정
  - 비즈니스 날짜/리셋 기준: **KST, 오전 9시**
- 미션/스트릭 도메인 계약: [docs/v2_specs/03_api/v2_mission_streak_api_contract_ko.md](../../03_api/v2_mission_streak_api_contract_ko.md)
- 운영 장애/해결(가장 중요한 3차 근거): [docs/v2_specs/05_ops/v2_mission_timezone_fix_20260122_ko.md](../../05_ops/v2_mission_timezone_fix_20260122_ko.md)
- FE 라우팅/페이지 근거:
  - 유저: [docs/v2_specs/06_design/V2_user_pages_list.md](../../06_design/V2_user_pages_list.md)
  - 어드민: [docs/v2_specs/06_design/V2_admin_pages_list.md](../../06_design/V2_admin_pages_list.md)
  - 어드민 마스터 플랜: [docs/v2_specs/06_design/v2_admin_master_plan_ko.md](../../06_design/v2_admin_master_plan_ko.md)
- 실시간 알림 reason 근거(미션 클레임 연동 시): [docs/v2_specs/03_api/v2_notification_feed_schema_ko.md](../../03_api/v2_notification_feed_schema_ko.md)

---

## 2. 1차 학습 요약 (Domain SoT ↔ 매핑표)
### 2.1 정책 핵심
- 미션/스트릭은 **수동 Claim**이 기본이며, 스트릭은 `claimable_day` 기준으로 UI 버튼이 동작해야 함.
- SoT 기준으로 “시간/운영일 계산은 서비스로 위임”되어야 하며, API 레이어에 중복 로직이 있으면 드리프트 위험이 큼.

### 2.2 매핑표 기준(SoT→코드/DB/FE)
- 미션/출석/스트릭 매핑은 [docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/mission.md](../../00_sot_meta/00_A_sot_code_ops_chk/mission.md)가 1차 기준표.
- 매핑표에서 특히 중요한 축:
  - 인증 식별자 혼재 리스크: `user.id` ↔ `v2_user.cc_id` ↔ `user.external_id`
  - 미션 진행 FK: `mission_progress.user_id`는 `user.id` 기준으로 연결됨(연동 시 주의)

---

## 3. 2차 학습 요약 (Core/API 계약 및 표준)
### 3.1 V2 미션/스트릭 API 계약(요약)
- 미션 목록/진행도: `GET /api/v2/mission/`
- 미션 보상 수령: `POST /api/v2/mission/{mission_id}/claim`
- 데일리 선물 수령: `POST /api/v2/mission/daily-gift`
- 스트릭 규칙 조회: `GET /api/v2/mission/streak/rules`
- 스트릭 보상 수령: `POST /api/v2/mission/streak/claim`

### 3.2 공통 계약/운영 시간 기준
- [docs/v2_specs/03_api/v2_api_contract_sot_ko.md](../../03_api/v2_api_contract_sot_ko.md)의 공통 규칙에 따라,
  - V2는 `/api/v2/` 고정
  - 비즈니스 리셋은 **KST 오전 9시**

### 3.3 알림/피드 연동 포인트
- 실시간 알림 스키마 예시로 `USER_ASSET_UPDATE.reason = "MISSION_CLEAR"`가 존재.
  - 근거: [docs/v2_specs/03_api/v2_notification_feed_schema_ko.md](../../03_api/v2_notification_feed_schema_ko.md)

---

## 4. 3차 학습 요약 (OPS/Design 기반 운영-프론트 정합)
### 4.1 운영 장애의 핵심 원인(OPS)
- Split-brain reset(자정 vs 9AM)로 인해 “로그인 미션은 오늘, 미션 리셋은 어제”처럼 `reset_date` 불일치가 발생할 수 있음.
- Action type mismatch로 인해 텔레그램/공유류 미션 진행도가 매칭 실패할 수 있음.
- FE가 mock/정적 상태이거나 claim 후 refetch가 없으면 “완료 후 버튼 정체/새로고침 필요”가 발생.
- 근거: [docs/v2_specs/05_ops/v2_mission_timezone_fix_20260122_ko.md](../../05_ops/v2_mission_timezone_fix_20260122_ko.md)

### 4.2 OPS 권고 솔루션 요약(SoT 우선 적용)
- 운영일 계산은 **KST timezone-aware**로 만들고, “운영일(9AM reset)” 계산은 서비스 단일 지점으로 통일.
- API 레이어에서 직접 날짜 계산/리셋 판단을 하지 않고 서비스에 위임.
- Action type은 `ACTION_TYPE_ALIASES` 류의 정규화로 **후방호환(legacy 키 포함)**을 유지.
- FE는 미션 화면에서 mock 제거 후 실제 API 연결, Claim 성공 시 refetch(또는 invalidate)로 UI 동기화.

### 4.3 Design/FE 라우팅 근거
- 유저 미션 페이지 라우팅: `/v2/missions` (API 상태 Real)
  - 근거: [docs/v2_specs/06_design/V2_user_pages_list.md](../../06_design/V2_user_pages_list.md)
- 어드민 “미션 매니저” 페이지 라우팅: `/v2/admin/game/missions` (API 상태 Real)
  - 근거: [docs/v2_specs/06_design/V2_admin_pages_list.md](../../06_design/V2_admin_pages_list.md)
- 어드민 백엔드 API 근거(문서 표기): `GET /api/v2/admin/game/missions`, `PUT /api/v2/admin/game/missions/{id}`
  - 근거: [docs/v2_specs/06_design/V2_admin_pages_list.md](../../06_design/V2_admin_pages_list.md)

---

## 5. DB(04_db) 관점 결론 및 TODO
### 5.1 현재 상태
- `docs/v2_specs/04_db/` 폴더 내에는 미션 전용 DB SoT 문서(예: `v2_db_mission_ko.md`)가 **존재하지 않음**(폴더 파일 목록 기준).
- 따라서 3차 학습에서 “미션 테이블/제약조건” 근거는 당장은 [docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/mission.md](../../00_sot_meta/00_A_sot_code_ops_chk/mission.md)를 1차 근거로 삼는다.

### 5.2 TODO (문서 보강)
- [ ] `docs/v2_specs/04_db/v2_db_mission_ko.md` 신설 필요
  - 포함해야 할 최소 항목: `user_mission`, `user_mission_streak`, `mission_progress` (또는 실제 테이블명), FK/UNIQUE/ENUM, 인덱스, 운영일/리셋 관련 컬럼 의미

---

## 6. 자동화/운영 체크포인트 (diff 리포트 입력)
### 6.1 Contract/라우팅 체크
- [ ] OpenAPI/계약 기준으로 미션 엔드포인트가 모두 `/api/v2/mission/*` 인지 확인
- [ ] FE 라우팅이 `/v2/missions` 와 실제 API 호출이 일치하는지 확인

### 6.2 시간/리셋 체크 (가장 중요)
- [ ] 00:00~09:00 KST 구간에서 로그인/미션 진행이 “운영일(9AM reset)” 기준으로 통일되는지 검증
- [ ] API 레이어에 자정 기준 날짜 계산이 남아있지 않은지 grep로 확인(서비스 단일화)

### 6.3 Action type 정합 체크
- [ ] seed/DB 미션 action_type과 API에서 호출하는 action key가 매칭되는지 확인
- [ ] alias(예: SUBSCRIBE/JOIN 등) 정규화가 후방호환으로 동작하는지 테스트 추가

### 6.4 FE 동기화 체크
- [ ] Claim 후 즉시 refetch/invalidate로 UI가 갱신되는지 확인
- [ ] 목데이터(MOCK) 잔재가 미션 화면에 남아있지 않은지 확인

---

## 7. 참고 링크 (Sources)
- 매핑표: [docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/mission.md](../../00_sot_meta/00_A_sot_code_ops_chk/mission.md)
- 공통 API SoT: [docs/v2_specs/03_api/v2_api_contract_sot_ko.md](../../03_api/v2_api_contract_sot_ko.md)
- 미션/스트릭 계약: [docs/v2_specs/03_api/v2_mission_streak_api_contract_ko.md](../../03_api/v2_mission_streak_api_contract_ko.md)
- 운영 장애/해결: [docs/v2_specs/05_ops/v2_mission_timezone_fix_20260122_ko.md](../../05_ops/v2_mission_timezone_fix_20260122_ko.md)
- FE 라우팅(유저): [docs/v2_specs/06_design/V2_user_pages_list.md](../../06_design/V2_user_pages_list.md)
- FE 라우팅(어드민): [docs/v2_specs/06_design/V2_admin_pages_list.md](../../06_design/V2_admin_pages_list.md)
- 어드민 마스터 플랜: [docs/v2_specs/06_design/v2_admin_master_plan_ko.md](../../06_design/v2_admin_master_plan_ko.md)
- 실시간 피드 스키마: [docs/v2_specs/03_api/v2_notification_feed_schema_ko.md](../../03_api/v2_notification_feed_schema_ko.md)
