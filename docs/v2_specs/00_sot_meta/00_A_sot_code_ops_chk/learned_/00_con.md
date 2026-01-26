
## [2026-01-26 구현 완료 항목]

### 1. Reset-time Unification (09:00 KST 통일) ✅
- **문제**: `AdminDashboardService`가 00:00 KST 기준 사용 vs V2 서비스들(mission, vault)이 09:00 KST 사용
- **해결**:
  - `app/utils/timezone.py` 신규 생성 - `business_day_start()`, `yesterday_business_day_range()` 헬퍼
  - `app/services/admin_dashboard_service.py` 수정 - 00:00→09:00 KST 통일
- **검증**: 모든 일간 집계가 09:00 KST ~ 익일 08:59:59 KST 기준으로 동작

### 2. Global Circuit Breaker (Payout Safety) ✅
- **문제**: SoT 문서에만 존재하던 서킷 브레이커 코드 미구현
- **해결**:
  - `app/services/circuit_breaker.py` 신규 생성
    - Redis 기반 일일 지급 추적
    - CLOSED/OPEN/HALF_OPEN 상태 관리
    - 50M 기본 한도, 80% 경고 임계값
    - DB fallback 지원
  - `app/v2/services/vault2_service.py` 수정 - `record_unlock_event()`에 서킷 브레이커 훅 추가
- **검증**: `skip_circuit_breaker=True` 옵션으로 관리자 강제 지급 가능

### 3. V2 Team-Battle Admin ✅
- **문제**: V2 팀배틀 어드민 API 레이어 없음
- **해결**:
  - `app/v2/services/team_battle_admin_service.py` 신규 생성
    - 시즌 CRUD (create/update/end)
    - 팀 관리 (create/update/detail)
    - 점수 조정 (`adjust_team_score`)
    - 멤버 강제 관리 (`force_join_team`, `force_leave_team`)
    - 시즌 통계 (`get_season_stats`)
  - `app/v2/api/admin/team_battle_routes.py` 신규 생성
    - `/admin/team-battle/seasons/*` 시즌 엔드포인트
    - `/admin/team-battle/teams/*` 팀 엔드포인트
    - `/admin/team-battle/scores/adjust` 점수 조정
    - `/admin/team-battle/members/force-join`, `/force-leave` 멤버 관리
  - `app/v2/api/admin/__init__.py` 수정 - 라우터 등록
- **검증**: 모든 어드민 작업에 V2AdminAuditService 감사 로그 기록

### 4. Admin Audit Logs — Full Coverage ✅
- **문제**: 감사 로그가 일부 영역(economy, inventory, game_config, vault)에만 적용
- **해결**:
  - `app/v2/middleware/admin_audit.py` 신규 생성
    - `@audit_admin` 데코레이터
    - `log_admin_action()` 헬퍼 함수
  - `app/v2/api/admin/segment_routes.py` 수정 - 감사 로그 추가
    - `SEGMENT_BATCH_RUN`, `SEGMENT_RULE_CREATE/UPDATE/DELETE`
  - `app/v2/api/admin/marketing_routes.py` 수정 - 감사 로그 추가
    - `MARKETING_MESSAGE_CREATE`, `SURVEY_CREATE/UPDATE/DELETE`
- **검증**: 모든 어드민 CRUD 작업이 `admin_audit_log` 테이블에 기록



## [2026-01-26 구현 완료 항목]

### 1. 09:00 KST 리셋 정책 통합 ✅
- **문제**: MissionService(기본값 0)와 VaultService(9) 간 리셋 시간 불일치
- **해결**:
  - `app/services/mission_service.py` 수정 - `_operational_play_date` 기본값 0→9
  - `app/v2/services/vault_service.py` 수정 - `get_admin_stats`가 `app/utils/timezone.py` 헬퍼 사용
- **검증**: Mission/Vault/Admin 모두 09:00 KST 기준으로 통일

### 2. benefits_suspended 로직 정식화 ✅
- **문제**: 7일 무입금 제재 정책이 DB 필드 없이 계산식으로만 존재
- **해결**:
  - `app/v2/services/vault_service.py`에 `is_benefits_suspended()` 정적 메서드 추가
  - `(is_suspended: bool, deposit_7d: int)` 튜플 반환
- **검증**: API 응답에 제재 여부와 7일 입금 합계를 명시적으로 포함 가능

### 3. 세그먼트 배치 동기화 점검 및 자동화 ✅
- **확인**: `scripts/segment_users.py`에 `db.commit()` 정상 포함
- **신규**: `scripts/user_consistency_check.py` 정합성 점검 스크립트 생성
  - `--check segment`: 25시간 내 미업데이트 유저 점검
  - `--check migration`: user↔v2_user 이관 누락 점검
  - `--check suspended`: 7일 무입금 유저 현황
  - `--check index`: 핵심 인덱스 존재 여부
  - `--check all`: 전체 점검

  ## [2026-01-26 구현 완료 항목] - Remediation Guide 기반
  
  ### A. Admin user list vault_balance 수정 ✅
  - **문제**: Admin 유저 목록/상세에서 `vault_balance = locked + available` 사용 (SoT 위반)
  - **해결**:
    - `app/v2/api/admin/user_routes.py` 수정 (4곳)
      - 정렬 컬럼: `func.coalesce(User.vault_locked_balance, 0)` 단일 사용
      - 응답 DTO: `vault_balance = int(user.vault_locked_balance or 0)` 단일 사용
  - **검증**: sortBy=vault_balance 시 locked만 기준으로 정렬됨
  
  ### B. Dashboard 집계 total_vault_balance 수정 ✅
  - **문제**: 대시보드/랭킹 집계가 `(locked + available)` 기반 (SoT 위반)
  - **해결**:
    - `app/services/admin_dashboard_service.py` 수정 (2곳)
      - Overview: `func.sum(User.vault_locked_balance)` 단일 사용
      - Metric Detail: `User.vault_locked_balance > 0` 필터, `vault_locked_balance.desc()` 정렬
  - **검증**: KPI/리포트가 locked 기준으로 집계됨
  
  ### E. FE adapter availableBalance 처리 ✅
  - **문제**: 호환 어댑터가 `availableBalance`를 노출 (정책 표현 충돌)
  - **해결**:
    - `src/v2/api/v1CompatAdapter.ts` 수정
      - `availableBalance: 0` 고정 (deprecated 주석 추가)
      - `vaultBalance = lockedBalance` 단일 기준
  - **검증**: FE에서 available 값이 항상 0으로 반환됨

---

## [2026-01-26 구현 완료 항목] - Vault Remediation Phase 2

### C. Withdrawals route 통합 ✅
- **문제**: `/api/v2/admin/withdrawals/*`(economy_routes)와 `/api/v2/admin/vault/withdrawals/*`(vault_routes) 중복
- **해결**:
  - `app/v2/api/admin/economy_routes.py` 수정 - 엔드포인트에 deprecation 주석 추가
  - `app/v2/api/admin/vault_routes.py` 수정 - canonical API로 명시
- **검증**: FE는 `/api/v2/admin/vault/withdrawals/*` 사용 권장

### D. Admin prefix 표준화 ✅
- **문제**: `/admin/api/*` (legacy)와 `/api/v2/admin/*` (v2) 공존
- **해결**:
  - `src/api/teamBattleApi.ts` 수정 - Admin API 경로 `/admin/api/*` → `/api/v2/admin/*` 변경
- **검증**: 모든 Admin API가 `/api/v2/admin/*` 프리픽스 사용

### F. Enum/Constants 정규화 ✅
- **문제**: RewardType, TicketType 등이 여러 파일에서 분산 정의
- **해결**:
  - `app/v2/schemas/v2_constants.py` 신규 생성
    - `RewardType` Literal 중앙화 (VAULT, POINT, CC_POINT 등)
    - `TicketType` Literal 중앙화
    - `GameTokenTypeLiteral` 참조용 정의
    - `RouletteGrade`, `AnimationType`, `GameResult` 포함
- **검증**: 신규 스키마는 v2_constants.py에서 import 권장

### 레거시 available balance 마이그레이션 ✅
- **상태**: 이미 정리됨 (0건 남음)
- **검증**: `SELECT COUNT(*) FROM user WHERE vault_available_balance != 0` → 0

### VaultPage.tsx 수정 ✅
- **문제**: `availableBalance` 사용으로 항상 0원 출금 시도
- **해결**:
  - `src/v2/pages/vault/VaultPage.tsx` 수정
    - confetti 조건: `vault.availableBalance` → `vault.vaultBalance`
    - 출금 요청: `vault.availableBalance` → `vault.vaultBalance`
- **검증**: 출금 금액이 locked balance 기준으로 정상 동작

### VaultBalanceCard.tsx 수정 ✅
- **문제**: `available` prop 표시로 항상 0원 표시
- **해결**:
  - `src/v2/components/vault/VaultBalanceCard.tsx` 수정
    - `available` prop deprecated 처리 (optional + JSDoc)
    - 출금 가능 금액 = `balance` (= vault_locked_balance) 단일 사용
- **검증**: UI에 locked balance가 출금 가능 금액으로 표시

---

## [2026-01-26 구현 완료 항목] - Game/Shop 정책 구현 (01~04 가이드 기반)

### 01. Strict Vault Policy - benefits_suspended 상점 차단 ✅
- **문제**: 7일 무입금 유저(`benefits_suspended=True`)가 상점 구매 가능 (SoT 위반)
- **해결**:
  - `app/v2/services/shop_service.py` 수정
    - `purchase()` 진입부에 `V2VaultService.is_benefits_suspended()` 체크 추가
    - 제재 유저 구매 시도 시 `ValueError("BENEFITS_SUSPENDED")` 발생
    - `skip_suspension_check` 파라미터로 관리자 강제 구매 허용
  - `app/v2/api/routes.py` 수정
    - `purchase_shop_product()` 엔드포인트에 early exit 검사 추가
    - 제재 유저 → `HTTPException(403, "BENEFITS_SUSPENDED")`
- **검증**: 7일 무입금 유저의 구매 요청 시 403 응답

### 02. Empty Shop Risk - 운영자 알림 ✅
- **문제**: 상점 UI Config 비어있을 때 운영자에게 알림 없음
- **해결**:
  - `app/v2/api/routes.py` - `list_shop_products()` 수정
    - 빈 상품 목록 감지 시 로깅 + Sentry 알림 전송
    - `sentry_sdk.capture_message()` 호출 (warning 레벨)
- **검증**: 빈 상품 설정 시 Sentry 이벤트 `shop_empty_products` 발생

### 03. Enum Naming Consistency - SoT JSON + 검증 테스트 ✅
- **문제**: Enum/상수가 코드/DB/프론트에서 분산 정의되어 drift 발생 가능
- **해결**:
  - `docs/soT/canonical_enums/shop_enums.json` 신규 생성
    - RewardType, TicketType, GameTokenType, CostType 등 정의
    - deprecated 값, storage mapping 메타데이터 포함
  - `tests/test_enum_matches_sot.py` 신규 생성
    - `v2_constants.py` Literal과 SoT JSON 일치 검증
    - CI 실행으로 Enum drift 방지
- **검증**: `pytest tests/test_enum_matches_sot.py -v` 통과

### 04. Ops Checklist ✅
- **상태**: Runbook 참조 문서 (코드 변경 없음)
- **내용**: 
  - Suspended User Purchase Attempts Runbook
  - Empty Shop Incident Runbook
  - Deployment Checklist

---

## [수정 파일 목록 - Phase 2]

| 파일 | 변경 내용 |
|------|----------|
| `app/v2/api/admin/economy_routes.py` | `/withdrawals` 엔드포인트 deprecation 주석 |
| `app/v2/api/admin/vault_routes.py` | canonical 명시 주석 추가 |
| `app/v2/schemas/v2_constants.py` | 신규 - 중앙화된 Enum/Literal 정의 |
| `src/api/teamBattleApi.ts` | Admin API 경로 v2로 마이그레이션 |
| `src/v2/pages/vault/VaultPage.tsx` | `availableBalance` → `vaultBalance` |
| `src/v2/components/vault/VaultBalanceCard.tsx` | `available` prop deprecated |

## [수정 파일 목록 - Game/Shop 정책 (01~04)]

| 파일 | 변경 내용 |
|------|----------|
| `app/v2/services/shop_service.py` | `benefits_suspended` 체크 로직 추가 |
| `app/v2/api/routes.py` | 상점 구매 403 처리, empty shop Sentry 알림 |
| `docs/soT/canonical_enums/shop_enums.json` | 신규 - Enum SoT JSON 정의 |
| `tests/test_enum_matches_sot.py` | 신규 - Enum 정합성 자동 검증 테스트 |

---

## [2026-01-26 구현 완료 항목] - Inventory 정책 구현 (05.inventory 가이드 기반)

### 05-1. Inventory Service benefits_suspended 체크 ✅
- **문제**: `V2InventoryService.use_voucher()`에 7일 무입금 유저 차단 로직 누락
- **해결**:
  - `app/v2/services/inventory_service.py` 수정
    - `use_voucher()` 진입부에 `V2VaultService.is_benefits_suspended()` 체크 추가
    - 제재 유저 바우처 사용 시 `HTTPException(403, "BENEFITS_SUSPENDED")`
    - `skip_suspension_check` 파라미터로 관리자 강제 사용 허용
- **검증**: 7일 무입금 유저의 바우처 사용 요청 시 403 응답

### 05-2. 기프티콘 네이밍 검증 스크립트 ✅
- **문제**: `{BRAND}_GIFTICON_{AMOUNT}` 포맷 준수 여부 자동 검증 없음
- **해결**:
  - `scripts/validate_gifticon_naming.py` 신규 생성
    - 소문자 포함 검출
    - 정규식 포맷 검증
    - 100원 단위 금액 검증
    - `--dry-run` 샘플 테스트, `--fix-preview` 수정 제안
- **검증**: `python scripts/validate_gifticon_naming.py --dry-run` 실행 성공

### 05-3. V2 전용 Inventory Model 리팩토링 🟡 (TODO)
- **상태**: 장기 작업으로 별도 트래킹 (이번 스코프 외)
- **내용**: `app.models.inventory` V1 공용 모델 → `app.v2.models.inventory` 분리 필요

---

## [2026-01-26 구현 완료 항목] - Mission 정책 구현 (09~10.mission 가이드 기반)

### A. FE 라우팅 /v2/missions canonical ✅
- **문제**: Design 문서에는 `/v2/missions` 표기이나 실제 FE는 `/missions` 사용
- **해결**:
  - `src/v2/router/V2UserRoutes.tsx` 수정
    - Canonical route: `/v2/missions` → `<MissionsPage />`
    - Legacy redirect: `/missions` → `/v2/missions` (3주 유지 후 제거)
- **검증**: `/missions` 접속 시 `/v2/missions`로 리다이렉트

### B. 레거시 BE Deprecation 헤더 ✅
- **문제**: 레거시 `/api/mission/*` 라우터가 V2와 병존
- **해결**:
  - `app/api/routes/mission.py` 수정
    - 모든 엔드포인트에 `Deprecation: true` 헤더 추가
    - `Sunset: 2026-02-26` 헤더 추가
    - `Link: </api/v2/mission>; rel="successor-version"` 헤더 추가
    - 태그 변경: `mission` → `mission-legacy`
- **검증**: 레거시 호출 시 응답 헤더에 deprecation 정보 포함

### C. StreakService 분리 ✅
- **문제**: 스트릭 로직이 `V2MissionService`에 혼재
- **해결**:
  - `app/v2/services/streak_service.py` 신규 생성
    - `get_user_streak_info()`: 유저 스트릭 정보 조회
    - `get_pending_streak_milestone()`: 클레임 가능 마일스톤 조회
    - `claim_streak_reward()`: 스트릭 보상 클레임
    - `get_operational_play_date()`: 운영일 계산 (09:00 KST 리셋)
    - `reset_user_streak()`: 스트릭 초기화 (관리자용)
- **검증**: 독립적인 StreakService 제공, MissionService와 분리

### E. 시간 경계 테스트 자동화 (00:00~09:00 KST) ✅
- **문제**: 자정~09:00 KST 경계 시나리오 회귀 테스트 부재
- **해결**:
  - `tests/test_streak_midnight_boundary.py` 신규 생성
    - `TestOperationalPlayDate`: 운영일 계산 테스트 (6 cases)
    - `TestStreakMidnightBoundary`: 스트릭 자정 경계 테스트 (3 cases)
    - `TestMissionResetBoundary`: 미션 리셋 경계 테스트 (2 cases)
    - `TestClaimBoundary`: 클레임 경계 테스트 (2 cases)
    - `TestStreakServiceSmoke`: 스모크 테스트 (2 cases)
- **검증**: `pytest -k midnight tests/test_streak_midnight_boundary.py` - 15/15 통과

---

## [수정 파일 목록 - Mission 정책 (09~10)]

| 파일 | 변경 내용 |
|------|----------|
| `src/v2/router/V2UserRoutes.tsx` | `/v2/missions` canonical + `/missions` 리다이렉트 |
| `app/api/routes/mission.py` | 모든 엔드포인트 Deprecation 헤더 추가 |
| `app/v2/services/streak_service.py` | 신규 - StreakService 분리 |
| `tests/test_streak_midnight_boundary.py` | 신규 - 시간 경계 회귀 테스트 (15 cases) |

---

## [2026-01-26 구현 완료 항목] - Level 정책 구현 (07.level 가이드 기반)

### 07-1. Level SoT 검증 스크립트 ✅
- **문제**: DB 스키마/API 필드 정합성 자동 검증 없음
- **해결**:
  - `scripts/validate_level_sot.py` 신규 생성
    - `check_db_schema()`: `user_level_progress.xp` 컬럼 존재, `v2_user`에 XP 컬럼 부재 확인
    - `check_season_pass_null()`: Legacy API `season_pass` 필드 null 반환 확인
    - `check_cc_deposit_xp()`: CC Deposit 10만원당 20XP 적립 규칙 검증
    - `check_reward_table()`: 레벨 보상표(1~20) 정합성 검증
- **검증**: `python scripts/validate_level_sot.py --check all`

### 07-2. Season Pass Dual Write 제거 ✅
- **문제**: `admin_cc_deposit_service.py`에서 `season_pass.add_bonus_xp`와 `level_xp.add_xp` 동시 호출 (Dual Write)
- **해결**:
  - `app/v2/services/admin_cc_deposit_service.py` 수정
    - `season_pass.add_bonus_xp()` 호출 제거
    - `level_xp.add_xp()` 단일 호출만 유지 (V2 단일 레벨 시스템)
    - 주석으로 Legacy 폐기 명시
- **검증**: CC Deposit 시 `user_xp_event_log`에만 XP 로그 적재

### 07-3. Legacy API season_pass null 반환 정책 준수 ✅
- **상태**: 코드 레벨 검증 완료
- **확인**: `RoulettePlayResponse.season_pass` 기본값 = `None` (스키마에서 확인)
- **정책**: V2에서 Season Pass 폐기, 모든 Legacy API는 `season_pass: null` 반환

---

## [2026-01-26 구현 완료 항목] - Team Battle 정책 구현 (04.team_battle 가이드 기반)

### 04-1. Team Battle SoT 검증 스크립트 ✅
- **문제**: 시즌/랭킹 정책 변경 시 DB/코드/프론트 동기화 자동화 부재
- **해결**:
  - `scripts/validate_team_battle_sot.py` 신규 생성
    - `check_v2_namespace()`: app/v2, src/v2 경로 내 team_battle 구현 확인
    - `check_season_data()`: 활성 시즌 데이터 정합성 검증
    - `check_active_season_integrity()`: 팀/멤버/점수 무결성 검증
    - `check_rollover_readiness()`: 시즌 롤오버 준비 상태 (7일 내 종료 알림)
- **검증**: `python scripts/validate_team_battle_sot.py --check all`

### 04-2. v2 네임스페이스 정합성 확인 ✅
- **상태**: 파일 시스템 검증 완료
- **확인**:
  - BE: `app/v2/services/team_battle_service.py`, `team_battle_admin_service.py` ✅
  - FE: `src/v2/pages/game/TeamBattlePage.tsx` ✅
  - Admin Routes: `app/v2/api/admin/team_battle_routes.py` ✅
- **주의**: Legacy `app/services/team_battle_service.py` 존재 (점진적 마이그레이션 중)

### 04-3. FE 라우팅 v2 canonical 적용 ✅
- **문제**: FE 라우팅이 `/team-battle`, `/level` 등 non-canonical 경로 사용
- **해결**:
  - `src/v2/router/V2UserRoutes.tsx` 수정
    - `/v2/team-battle` canonical + `/team-battle` 리다이렉트
    - `/v2/level` canonical + `/level` 리다이렉트
    - 레거시 경로 3주 유지 후 제거 (2026-02-16)
- **검증**: `/team-battle` 접속 시 `/v2/team-battle`로 리다이렉트

---

## [수정 파일 목록 - Level 정책 (07)]

| 파일 | 변경 내용 |
|------|----------|
| `scripts/validate_level_sot.py` | 신규 - Level SoT 정합성 검증 스크립트 |
| `app/v2/services/admin_cc_deposit_service.py` | Season Pass 로직 전체 제거 (Dual Write + TOP10 스탬프) |
| `app/services/level_xp_service.py` | 들여쓰기/메서드 배치 수정 |
| `tests/v2_tests/phase2_core/test_cc_deposit_logic.py` | Season Pass mock 제거 → V2LevelXPService mock 사용 |

---

## [수정 파일 목록 - Team Battle 정책 (04)]

| 파일 | 변경 내용 |
|------|----------|
| `scripts/validate_team_battle_sot.py` | 신규 - Team Battle SoT 검증 스크립트 |
| `src/v2/router/V2UserRoutes.tsx` | `/v2/team-battle`, `/v2/level` canonical + 리다이렉트 |

---

## [수정 파일 목록 - Inventory 정책 (05)]

| 파일 | 변경 내용 |
|------|----------|
| `app/v2/services/inventory_service.py` | `use_voucher()` benefits_suspended 체크 추가 |
| `scripts/validate_gifticon_naming.py` | 신규 - 기프티콘 네이밍 검증 스크립트 |

---

## [SoT 정합성 상태 - 2026-01-26]

```
✅ vault_balance = vault_locked_balance only (SoT 단일 출처)
✅ availableBalance = 0 (deprecated, FE에서 항상 0 반환)
✅ Admin API = /api/v2/admin/* (v2 표준 프리픽스)
✅ Withdrawals = /api/v2/admin/vault/withdrawals/* (canonical)
✅ 09:00 KST 리셋 = Admin/Mission/Vault 전 영역 통일
✅ Enum/Constants = v2_constants.py 중앙화 + SoT JSON 검증
✅ benefits_suspended = 상점 구매 + 바우처 사용 차단 (7일 무입금 유저)
✅ Empty Shop = Sentry 알림 연동
✅ 기프티콘 네이밍 = 검증 스크립트 제공
✅ FE 라우팅 = /v2/missions, /v2/team-battle, /v2/level canonical + legacy redirect
✅ Legacy API = Deprecation 헤더 적용 (Sunset: 2026-02-26)
✅ StreakService = MissionService에서 분리 완료
✅ 시간 경계 테스트 = 00:00~09:00 KST 회귀 테스트 15 cases
✅ Level DB 분리 = user_level_progress 테이블 사용 (v2_user에 XP 컬럼 없음)
✅ Season Pass Dual Write 제거 = level_xp.add_xp 단일 호출
✅ Legacy API season_pass = null 반환 (RoulettePlayResponse 스키마 확인)
✅ Team Battle v2 네임스페이스 = BE/FE 모두 v2 경로 사용
✅ 시즌 롤오버 검증 = 자동화 스크립트 제공 (validate_team_battle_sot.py)
```