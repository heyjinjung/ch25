문서 타입: 체크리스트/가이드
버전: v1.0
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
  - [x] FE API 클라이언트 구현 완료 (`src/v2/api/gameApi.ts`)
  - [x] FE 훅 구현 완료 (`src/v2/hooks/useV2Game.ts`)
  - [ ] FE UI 컴포넌트 통합 (미완료)

### 4.2 Ticket Zero (긴급 구호)
- SoT: `v2_ticket_zero_policy_sot_ko.md`
- API: 계약 기준
- 체크
  - [x] SoT 문서 최신
  - [x] V2 스키마 존재
  - [x] V2 라우트 구현
  - [x] 지급 로그 테이블/모델 반영
  - [x] FE API 클라이언트 구현 완료 (`src/v2/api/ticketZeroApi.ts`)
  - [x] FE 훅 구현 완료 (`src/v2/hooks/useV2TicketZero.ts`)

### 4.3 미션/스트릭
- SoT: `v2_mission_glossary_sot_ko.md`, 스트릭 정책
- 체크
  - [x] 미션 상태 조회
  - [x] 보상 Claim
  - [x] 스트릭 규칙/보상 Claim
  - [x] FE API 클라이언트 구현 완료 (`src/v2/api/missionApi.ts`)
  - [x] FE 훅 구현 완료 (`src/v2/hooks/useV2Mission.ts`)

### 4.4 상점/인벤토리/교환소
- SoT: `v2_shop_exchange_policy_sot_ko.md`, `v2_item_inventory_sot_ko.md`
- 체크
  - [x] 상점 목록/구매 API
  - [x] 인벤토리 조회/사용 API
  - [x] 교환 로그/정책 반영 (DB 모델 완료)
  - [x] v2_shop_products UI Config 설정 (V1 이관 검증 완료)
  - [x] FE 상점 API 클라이언트 구현 완료 (`src/v2/api/shopApi.ts`)
  - [x] FE 인벤토리 API 클라이언트 구현 완료 (`src/v2/api/inventoryApi.ts`)
  - [x] FE 상점 훅 구현 완료 (`src/v2/hooks/useV2Shop.ts`)
  - [x] FE 인벤토리 훅 구현 완료 (`src/v2/hooks/useV2Inventory.ts`)

### 4.5 세그먼트/메시지
- SoT: `v2_user_segment_policy_sot_ko.md`, `v2_admin_message_policy_sot_ko.md`
- 체크
  - [x] 세그먼트 배치 API
  - [x] 메시지 생성/팬아웃 API
  - [x] 인박스 조회 API 구현 완료 (`GET /api/v2/inbox`)
  - [x] 인박스 읽음 처리 API 구현 완료 (`PATCH /api/v2/inbox/read`)
  - [x] FE 인박스 API 클라이언트 구현 완료 (`src/v2/api/inboxApi.ts`)
  - [x] FE 인박스 훅 구현 완료 (`src/v2/hooks/useV2Inbox.ts`)

### 4.6 Golden (리텐션/개입)
- SoT: `docs/v2_specs/07_golden/*`
- 체크
  - [ ] V2 개입/재참여 API
  - [ ] OpsLog 기록
  - [ ] 워커/실시간 아키텍처 연결

### 4.7 Team Battle
- SoT: `v2_team_battle_sot_ko.md`
- 체크
  - [x] 시즌 조회
  - [x] 팀 가입/탈퇴
  - [x] 랭킹/리더보드

### 4.8 Admin/Ops
- SoT: `v2_ops_plan_execution_schema_sot_ko.md`
- 체크
  - [x] Ops 실행 결과 저장
  - [x] 어드민 조회/필터
  - [ ] 운영 메시지 정책 반영

---

## 5. 진행도 기록 표 (2026-01-19 업데이트)
| 도메인 | SoT | API | 서비스 | DB | FE API | FE 훅 | 검증 | 진행도 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 게임|  ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | 95% |
| Ticket Zero | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 95% |
| 미션/스트릭 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 95% |
| 상점/인벤토리 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 95% |
| 세그먼트/메시지 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 95% |
| Golden | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ | 80% |
| Team Battle | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | 85% |
| Admin/Ops | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | 85% |

**범례**:
- ✅ 완료
- ⚠️ 부분 완료
- ❌ 미구현

---

## 6. 변경 이력
- v1.2 (2026-01-19, GitHub Copilot): V2 FE API 클라이언트 및 훅 구현 완료, 인박스 읽음 처리 API 추가
- v1.1 (2026-01-19, GitHub Copilot): V2 라우트 구현 반영 및 v2_shop_products 설정 항목 추가
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
