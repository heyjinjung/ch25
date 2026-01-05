# 어드민 전체 시스템 개편 설계서: 회원 식별/필드 표준화 (TG ID / Username / 실명·연락처 / 닉네임)

작성일: 2026-01-03

## 1) 목표(왜 하는가)

현재 어드민 회원관리 화면(스크린샷 기준)에서는 관리자가 다음 4개 필드를 중심으로 운영합니다.

- **TG ID**
- **TG Username**
- **실명/연락처(PII)**
- **닉네임(본사 고유 닉네임)**

하지만 다른 어드민 기능(외부랭킹/토큰지급/인벤토리/볼트/미션 등)에서는 `user_id`나 `external_id`를 기준으로만 작업하는 흐름이 섞여 있어,
- 동일 회원을 모듈마다 다른 키로 찾게 되고
- 수정/조회 시 필드가 누락되거나
- 문자열 식별자(텔레 @username/닉네임/실명) 기반 운영이 일관되지 않습니다.

**목표**: “사용자(회원)와 연결되는 모든 어드민 CRUD”에서
- 동일한 **회원 식별 규칙**
- 동일한 **표준 사용자 요약 필드**
- 동일한 **입력(식별자) → user_id 해석(Resolver)**
을 제공하도록 **백엔드 API 계약과 프론트 UI를 표준화**합니다.

> 범위 해석(중요): 본 설계서는 **회원(=User)과 직접 연결되는 CRUD**에 적용합니다.
> (룰렛/주사위/시즌/상점/설문 설정 등 “사용자와 무관한 설정형 CRUD”에는 해당 4필드가 등장하지 않으므로, 거기까지 억지로 필드를 추가하지 않습니다.)

---

## 2) 현황(리포 기준 사실)

### 2.1 DB/모델 저장 구조
- 사용자 테이블 `user` (핵심)
  - `id` (PK)
  - `external_id` (unique, not null)
  - `nickname` (nullable)
  - `telegram_id` (BigInteger, unique, nullable)
  - `telegram_username` (nullable)
- 민감/CRM 프로필 `admin_user_profile` (user_id=PK)
  - `real_name`, `phone_number`
  - `telegram_id` (string 형태로도 저장되는 케이스 존재)
  - `tags`, `memo`

### 2.2 텔레그램 가입시 external_id 패턴
텔레그램 미니앱 신규 가입 시 `external_id`는 다음 형식으로 생성됩니다.
- `tg_{telegram_id}_{unique_suffix}`
  - 예: `tg_8338823321_d9695d15`

또한 기존 계정을 텔레그램으로 **링크**하거나, 어드민이 **미리 만들어 둔 계정**에 `telegram_username`으로 매칭되는 흐름이 존재합니다.

### 2.3 어드민 기능 인벤토리(페이지/라우트)
- 백엔드 admin 라우트 그룹(25개 + 별도 1개)
  - `/admin/api/users`, `/admin/api/crm`, `/admin/api/external-ranking`, `/admin/api/game-tokens`, `/admin/api/inventory`, `/admin/api/user-missions`, `/admin/api/vault*`, `/admin/api/team-battle`, …
  - 추가로 `app/api/routes/admin_user_merge.py`에 `/admin/api/user/*` 계열 존재
- 프론트 admin 페이지(25개)
  - `UserAdminPage`, `ExternalRankingPage`, `GameTokenGrantPage`, `TicketManagerPage`, `AdminMissionPage`, `VaultAdminPage`, `MessageCenterPage`, …

---

## 3) 표준 필드 정의(관리자가 원하는 4필드)

관리자 관점에서 모든 화면/CRUD에서 최소 다음을 **표준 필드로 동일하게 노출/사용**합니다.

- `tg_id` : Telegram numeric ID (가능하면 number)
- `tg_username` : Telegram username (저장 시 `@` 없이, 표시 시 `@` 포함 가능)
- `real_name` : 실명
- `phone_number` : 연락처
- `nickname` : 본사 고유 닉네임(=user.nickname)

> 실무 팁: “실명/연락처”는 하나의 컬럼처럼 보이지만 저장은 `real_name`/`phone_number`로 분리하고, UI에서 합쳐 표시합니다.

---

## 4) 사용자 식별자 규칙(Resolver 표준)

### 4.1 입력 식별자 타입
어드민 입력(검색/수정/삭제/지급 등)에서 관리자가 넣을 수 있는 값은 다음을 허용합니다.

1) `user_id` (정수)
2) `tg_id` (정수 문자열도 허용)
3) `@username` 또는 `username` (대소문자 무시)
4) `nickname` (대소문자 무시)
5) `external_id` (레거시; 필요 시)
6) `tg_{id}_{suffix}` 패턴 문자열

### 4.2 해석 우선순위(충돌 방지)
동일 문자열이 여러 필드에 걸쳐 매칭될 수 있으므로, resolver는 다음 **우선순위**로 단일 user를 결정합니다.

1) 정확히 정수인 경우: `user_id` 정확 매칭(존재하면) → 아니면 `telegram_id` 정확 매칭
2) `tg_\d+_` 패턴인 경우: `telegram_id` 후보 추출 후 정확 매칭
3) `@` 제거 후 username 매칭: `telegram_username` (case-insensitive)
4) nickname 매칭 (case-insensitive)
5) external_id 매칭 (case-insensitive)

### 4.3 모호성 처리(필수)
- nickname/telegram username(또는 기타)로 2명 이상 매칭되는 경우 **409 CONFLICT (AMBIGUOUS_IDENTIFIER)**
  - 자동 선택/추정은 금지(=반드시 막는다)
  - (권장) 응답에 후보 5~10명 요약(아래 표준 요약 스키마)을 포함하여 관리자가 `tg_id`/`user_id` 등 더 강한 식별자로 재시도하도록 유도

---

## 5) 표준 사용자 요약 스키마(모든 API 응답에 통일)

어드민 기능에서 user를 보여주거나 선택해야 하는 곳은, 기존 `user_id`만 주지 말고 다음 `AdminUserSummary`를 **항상 함께 제공**합니다.

```json
{
  "user": {
    "id": 123,
    "nickname": "나이스비",
    "external_id": "tg_8338823321_d9695d15",
    "tg_id": 8338823321,
    "tg_username": "Zzzzzpty",
    "real_name": "남상현",
    "phone_number": "010-....",
    "tags": ["VIP"],
    "memo": "..."
  }
}
```

### 5.1 tg_id 산출 규칙(백엔드 단일화)
- 1순위: `user.telegram_id`
- 2순위: `admin_user_profile.telegram_id`가 숫자면 parse
- 3순위: `user.external_id`가 `tg_{id}_...`면 parse

> 이렇게 하면 “tg_8338823321_d9695d15에서 8338823321만 따서 쓰는” 운영이 **UI/운영자 수작업 없이 자동화**됩니다.

---

## 6) API 개편 설계(모든 사용자-연관 CRUD에 적용)

### 6.1 공통: Resolve Endpoint 추가
모든 페이지가 동일한 resolver를 쓰도록, 단일 엔드포인트를 제공하는 것이 비용/일관성 측면에서 유리합니다.

- `GET /admin/api/users/resolve?identifier=...`
  - 성공: `{ user: AdminUserSummary }`
  - 모호: `409` + `{ candidates: AdminUserSummary[] }`
  - 미존재: `404`

### 6.2 공통: user_id 기반 입력의 확장(하위호환)
기존 요청이 `user_id`를 받는 경우, 하위 호환을 유지하면서 아래 둘 중 하나를 지원합니다.

- 옵션 A(권장): 동일 endpoint에서 `user_id` 또는 `user_identifier` 둘 중 하나를 받도록 확장
  - 예: `{ "user_id": 123, ... }` 또는 `{ "user_identifier": "@Zzzzzpty", ... }`
- 옵션 B: 별도 by-identifier endpoint 추가
  - 예: `PUT /admin/api/some-module/by-identifier/{identifier}`

> 이미 외부랭킹은 Option B 형태의 by-identifier endpoint가 존재하므로, 다른 모듈에도 같은 패턴을 적용할 수 있습니다.

### 6.3 모듈별 적용 포인트(“사용자 연관 CRUD”)
아래는 표준 적용 대상(대표)입니다.

- 회원관리: `/admin/api/users/*`
  - 리스트/검색 응답에 `AdminUserSummary` 그대로 사용
  - 업데이트 시 `telegram_id`, `telegram_username`, `admin_profile.real_name/phone_number` 표준 유지

- 외부랭킹: `/admin/api/external-ranking/*`
  - 이미 문자열 식별자 지원(telegram username / nickname 포함)
  - 응답에도 user 요약을 표준 포함(가능하면)

- 게임 토큰 지급/로그: `/admin/api/game-tokens/*`
  - 지급 대상 입력: `user_identifier` 지원
  - 로그 조회: user 정보 표시 시 `AdminUserSummary` 포함

- 인벤토리/티켓 관리: `/admin/api/inventory/*`
  - 지급/회수/조회 등 user 연결이 있으면 동일

- 미션/세그먼트/CRM: `/admin/api/user-missions/*`, `/admin/api/segments/*`, `/admin/api/crm/*`
  - 사용자 선택/대상 집합이 있을 때 user summary 동일

- Vault 운영: `/admin/api/vault*`
  - 사용자 대상 운영 작업(락/만료/정산)이 있으면 동일

- 팀배틀: `/admin/api/team-battle/*`
  - 멤버 목록/리더보드에서 user summary 표시(닉네임만이 아니라 4필드 중 가능한 범위)

---

## 7) 프론트 개편 설계(화면 공통 규칙)

### 7.1 표준 표시 규칙(스크린샷 동일 UX)
테이블/리스트 어디서든 사용자 표시가 필요한 경우 다음을 기본으로 합니다.

- `TG ID / Username` 컬럼
  - `tg_id`는 숫자 표시
  - `tg_username`은 `@{username}` 형태로 표시(저장은 `@` 없이)
- `실명/연락처` 컬럼
  - `real_name` / `phone_number` 합쳐 표시
- `닉네임` 컬럼
  - `nickname` 표시

> 핵심: “어떤 모듈이든 사용자 보이면 동일한 4필드가 보인다”

### 7.2 입력 UX 표준
- 사용자 선택이 필요한 폼은 단일 입력창(“식별자 입력”)을 제공
  - 입력 허용: 숫자(tg_id), @username, nickname, external_id, tg_... 패턴
- 제출 전 `resolve` 호출로 단일 사용자 확정
  - 모호성(409)이면 후보 목록 보여주고 선택

---

## 8) DB/데이터 마이그레이션(정합성 강화)

### 8.1 backfill(권장)
- `user.telegram_id`가 NULL인데 `external_id`가 `tg_{id}_...`인 경우
  - `telegram_id`를 backfill
- `user.telegram_username`가 NULL인데 external_id가 `@username` 형태거나, admin_profile에 단서가 있으면 보정(가능한 범위)

### 8.2 단일 소스 오브 트루스
- TG ID의 source of truth는 `user.telegram_id`
- 실명/연락처는 `admin_user_profile` (PII 분리 유지)
- `admin_user_profile.telegram_id`(string)는 레거시/임포트 호환용으로 유지하되, 표준 표시는 `user.telegram_id`로 통일

---

## 9) 권한/감사(Audit) 설계(운영 필수)

- PII(실명/연락처) 변경은
  - 누가(어드민 계정)
  - 언제
  - 어떤 값에서 어떤 값으로
  를 남기는 변경 로그가 필요

(구현 선택지)
- 간단: `admin_audit_log` 테이블에 JSON diff 기록
- 또는: 기존 CRM/메시지 시스템과 동일한 방식으로 이벤트 로그 테이블 추가

---

## 10) 롤아웃(무중단) 계획

1) **API 먼저**: `resolve` 추가 + 각 모듈 요청 body에 `user_identifier` 옵션 추가(기존 `user_id` 유지)
2) **프론트 적용**: 사용자 선택 필요한 화면부터 단계적 적용(외부랭킹/토큰지급/인벤토리/볼트/미션)
3) **회원관리 화면 정합성**: tg_id 산출/표시 규칙 통일, external_id는 보조로만
4) **마이그레이션**: backfill 스크립트 실행(운영 시간대 조정)
5) **경보/모니터링**: 409(모호) 빈도, resolve 실패(404) 빈도, 수정 이벤트 로그 점검

---

## 11) 테스트 계획(회귀 방지)

- Resolver 단위 테스트
  - 숫자 입력이 user_id vs tg_id 충돌 시 우선순위
  - `tg_833..._xxxx` 파싱
  - `@username` 대소문자 무시
  - nickname 중복 → 409

- 모듈별 API 테스트(대표 3~5개)
  - 외부랭킹/토큰지급/인벤토리/볼트/미션에서 identifier로 CRUD 성공

- E2E(선택)
  - 어드민에서 identifier 입력 → 후보 선택 → 작업 성공

---

## 12) 결정 사항(확정)

1) “본사 고유 닉네임”은 `user.nickname`을 source of truth로 사용
2) `nickname`/`telegram_username`이 중복으로 매칭되면 **항상 409로 차단**(관리자가 `tg_id`/`user_id` 등으로 재시도)

---

## 부록 A) 적용 대상 모듈 체크리스트(초안)

사용자-연관 CRUD 우선순위(높음→낮음)
- 회원관리(UserAdmin)
- 외부랭킹(ExternalRanking)
- 토큰 지급/로그(GameTokens)
- 인벤토리/티켓(Ticket/Inventory)
- Vault 운영(Vault)
- 미션(UserMissions)
- CRM 세그먼트/프로필(CRM/Segments)
- 팀배틀(TeamBattle)

