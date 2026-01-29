문서 타입: SoT
버전: v1.1
작성일: 2026-01-28
수정일: 2026-01-29
작성자: GitHub Copilot
대상: BE/FE/기획/운영
상태: 구현 완료 ✅

[최종 검토일: 2026-01-29]
정책 최신화 필요 여부: 🟢 코드 구현 완료, DB Migration 대기

---

# V2 Telegram Auth SoT (텔레그램 인증 단일 원천)

## 1. 목적 (Purpose)

Telegram Mini App 기반 인증 정책 및 V2 시스템 통합 방식을 정의한다.
9개 도메인(admin, game, inventory, level, mission, shop, teambattle, user, vault)과 유기적으로 연동되는 인증 체계를 수립한다.

## 2. 범위 (Scope)

- Telegram initData 검증
- 신규 유저 생성 정책
- 기존 유저 연동 (link_* 코드)
- 추천인 로직 (ref_*)
- Pre-Release DEV 로그인 정책
- 토큰 정책 (Access/Refresh)
- RBAC 권한 모델
- 세션/디바이스 관리
- 감사 로그 정책

## 3. 용어 정의 (Definitions)

| 용어 | 정의 |
|------|------|
| initData | Telegram Mini App이 제공하는 HMAC-SHA256 서명된 유저 정보 |
| link_* | 기존 웹 계정과 텔레그램 연동을 위한 일회용 코드 |
| ref_* | 추천인 코드 (start_param으로 전달) |
| Access Token | 15분 만료 JWT, API 인증용 |
| Refresh Token | 30일 sliding window JWT, Access Token 갱신용 |
| RBAC | Role-Based Access Control, 역할 기반 접근 제어 |
| Operational Day | 09:00 KST 리셋 기준 운영일 |

---

## 4. 주요 DB 컬럼/제약조건/Enum

### [A] Auth 관련 DB 스키마

| 테이블/컬럼 | 제약조건 | 설명 | 비고 |
|------------|---------|------|------|
| user.id | PK, INT | 마스터 유저 ID | V1/V2 공통 |
| user.telegram_id | BIGINT, UNIQUE, NULL | 텔레그램 유저 ID | 인증 키 |
| user.telegram_username | VARCHAR(100), INDEX | @username | 검색용 |
| user.telegram_is_blocked | BOOLEAN, DEFAULT FALSE | 차단 상태 | |
| user.telegram_join_count | INT, DEFAULT 0 | 로그인 횟수 | |
| user.first_login_at | DATETIME, NULL | 최초 로그인 | |
| user.last_login_at | DATETIME, NULL | 마지막 로그인 | |
| v2_user.id | PK, INT | V2 유저 ID | user.id와 동일 |
| v2_user.cc_id | VARCHAR(100), UNIQUE, NOT NULL | 외부 ID | V2 인증 키 |
| v2_user.vault_locked_balance | INT, NOT NULL | 금고 잔액 | SoT 단일 출처 |
| telegram_link_code.code | VARCHAR(12), UNIQUE | 링크 코드 | 1회용 |
| telegram_link_code.user_id | FK(user.id) | 유저 참조 | |
| telegram_link_code.expires_at | DATETIME | 만료 시각 | |
| telegram_link_code.used_at | DATETIME, NULL | 사용 시각 | |
| admin_user_profile.tags | JSON | RBAC 태그 | ROLE_* 형식 |

### [B] Auth Event Type Enum (신규 정의)

| Enum | 설명 | 기록 시점 |
|------|------|----------|
| LOGIN_SUCCESS | 로그인 성공 | Telegram/DEV/V2 Auth 성공 시 |
| LOGIN_FAILED | 로그인 실패 | initData 검증 실패 등 |
| LOGOUT | 로그아웃 | /api/v2/auth/logout 호출 시 |
| TOKEN_REFRESH | 토큰 갱신 | /api/v2/auth/refresh 호출 시 |
| TELEGRAM_LINK | 텔레그램 연동 | link_* 코드로 연동 성공 시 |
| TELEGRAM_UNLINK | 텔레그램 해제 | 연동 해제 요청 시 |
| RBAC_DENIED | 권한 거부 | Admin API 접근 거부 시 |

---

## 5. 프론트-백엔드-DB-코드-정책 1:1 매핑

| 정책 문서 | 실제 코드 | DB 컬럼/제약 | FE API 경로 | 상태 |
|----------|----------|-------------|------------|------|
| Telegram initData 검증 | `app/v2/core/telegram.py::validate_init_data()` | - | `/api/v2/telegram/auth` | ✅ 구현 완료 (hash 비교 포함) |
| Access Token 발급 | `app/core/security.py::create_access_token()` | - | - | ✅ 정합 |
| Refresh Token 발급 | `app/v2/services/auth_service.py::issue_tokens()` | v2_user_refresh_token | `/api/v2/auth/refresh` | ✅ 구현 완료 |
| DEV 로그인 | `app/v2/api/dev_login.py` | v2_user.cc_id | `/api/v2/dev/login` | ✅ 정합 (env 제한) |
| RBAC 검증 | `app/api/deps.py::get_current_admin_info()` | admin_user_profile.tags | - | ✅ 정합 |
| 로그인 이력 | `app/v2/models/auth_event.py` | v2_user_auth_event | - | ✅ 구현 완료 |
| 로그아웃 | `app/v2/api/auth_routes.py::v2_logout()` | v2_user_refresh_token | `/api/v2/auth/logout` | ✅ 구현 완료 |

---

## 6. 텔레그램 Mini App 인증 정책

### 6.1 인증 플로우 (SoT)

```
1. Telegram Mini App → initData 전송
2. BE → HMAC-SHA256 서명 검증 (TELEGRAM_BOT_TOKEN 기반)
3. BE → telegram_id로 기존 유저 조회
4. 신규 유저 시:
   a. start_param이 "link_{code}" → 기존 계정 연동
   b. telegram_username으로 사전 생성 유저 조회
   c. 없으면 자동 생성 (external_id: tg_{tg_id}_{uuid8})
5. 기존 유저 시:
   a. last_login_at 갱신
   b. telegram_join_count 증가
6. LOGIN 미션 진행 (09:00 KST 리셋 기준)
7. Access Token 발급 (15분 만료)
8. Refresh Token 발급 (30일 sliding)
9. 로그인 이벤트 기록 (v2_user_auth_event)
```

### 6.2 initData 검증 상세

**정책**: Telegram 공식 문서 기준 (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)

```
1. initData에서 'hash' 추출 및 제거
2. 나머지 필드를 key=value 형식으로 알파벳순 정렬
3. '\n'으로 연결하여 data_check_string 생성
4. secret_key = HMAC-SHA256("WebAppData", bot_token)
5. calculated_hash = HMAC-SHA256(secret_key, data_check_string)
6. calculated_hash == provided_hash 검증 ← ✅ 구현 완료
```

### 6.3 신규 유저 생성 정책

| 필드 | 값 | 비고 |
|------|-----|------|
| external_id | `tg_{telegram_id}_{random8}` | 8자리 UUID |
| nickname | `{first_name} {last_name}` 또는 `@username` 또는 `tg_user_{telegram_id}` | 우선순위 순 |
| telegram_id | Telegram User ID | BIGINT |
| first_login_at | 현재 시각 (UTC) | |
| vault_locked_balance | 0 | 초기 보너스는 미션으로 지급 |

### 6.4 기존 유저 연동 정책

```
1. start_param = "link_{code}" 형식 검증
2. DB에서 telegram_link_code 조회 (FOR UPDATE)
3. 만료 여부 확인 (expires_at > NOW)
4. 사용 여부 확인 (used_at IS NULL)
5. user.telegram_id 업데이트
6. telegram_link_code.used_at 갱신
7. telegram_join_count 증가
8. TELEGRAM_LINK 이벤트 기록
```

### 6.5 추천인 정책

```
1. start_param = "ref_{user_id}" 형식 검증
2. 추천인 user_id 존재 확인
3. 신규 유저에 referrer_id 기록
4. 추천인에게 보상 지급 (미션 시스템 연동)
```

---

## 7. Pre-Release DEV 로그인 정책

### 7.1 환경 제한

| 환경 | DEV 로그인 | Telegram 검증 |
|------|-----------|--------------|
| local | 허용 | 우회 가능 (TEST_MODE) |
| development | 허용 | 우회 가능 |
| dev | 허용 | 우회 가능 |
| staging | 차단 (403) | 강제 |
| production | 차단 (403) | 강제 |

### 7.2 DEV 로그인 플로우

```
Endpoint: POST /api/v2/dev/login
Request: { cc_id, nickname?, create_if_missing }

1. 환경 확인 (env ∈ ["local", "development", "dev"])
2. cc_id로 V2User 조회
3. 없으면 생성 (create_if_missing=true일 때만)
4. JWT Access Token 발급
5. LOGIN 미션 진행
6. 로그인 이벤트 기록
```

### 7.3 프로덕션 배포 전 체크리스트

- [ ] `DEV_LOGIN_ENABLED=false` 환경변수 확인
- [ ] `/api/v2/dev/login` 403 반환 확인
- [ ] `TEST_MODE=false` 확인
- [ ] `TELEGRAM_BOT_TOKEN` 설정 확인

---

## 8. 토큰 정책

### 8.1 Access Token

| 항목 | 값 | 비고 |
|------|-----|------|
| 만료 | 15분 | JWT_EXPIRE_MINUTES 설정 |
| 알고리즘 | HS256 | JWT_ALGORITHM 설정 |
| Claims | sub, iat, exp, typ, role?, roles? | |

**Claims 상세**:
```json
{
  "sub": "123",           // user_id (string)
  "iat": 1706432000,      // 발급 시각 (Unix timestamp)
  "exp": 1706432900,      // 만료 시각 (iat + 15분)
  "typ": "access",        // 토큰 타입
  "role": "ADMIN",        // 관리자 역할 (optional)
  "roles": ["ADMIN"]      // 역할 배열 (optional)
}
```

### 8.2 Refresh Token

| 항목 | 값 | 비고 |
|------|-----|------|
| 만료 | 30일 sliding window | |
| 알고리즘 | HS256 | |
| Claims | sub, iat, exp, typ, jti | |
| DB 저장 | v2_user_refresh_token | jti 인덱싱 |

**Claims 상세**:
```json
{
  "sub": "123",
  "iat": 1706432000,
  "exp": 1709024000,      // iat + 30일
  "typ": "refresh",
  "jti": "abc123..."      // 토큰 고유 ID (UUID)
}
```

### 8.3 Token Refresh 플로우

```
Endpoint: POST /api/v2/auth/refresh
Request: { refresh_token }

1. Refresh Token 서명 검증
2. DB에서 jti로 토큰 조회
3. revoked_at 확인 (NULL이어야 함)
4. expires_at 확인 (미만료)
5. 새 Access Token 발급
6. last_used_at 갱신 (sliding window)
7. 만료 30일 미만 시 새 Refresh Token 발급 + 기존 revoke
8. TOKEN_REFRESH 이벤트 기록
```

### 8.4 로그아웃 플로우

```
Endpoint: POST /api/v2/auth/logout
Request: { refresh_token? }

1. Refresh Token 있으면 revoked_at 업데이트
2. Access Token은 자연 만료 (15분)
3. LOGOUT 이벤트 기록
```

---

## 9. RBAC 권한 모델

### 9.1 역할 정의

| 역할 | 설명 | 권한 범위 |
|------|------|----------|
| USER | 일반 유저 | 유저 API 접근 |
| OPERATOR | 운영자 | 제한적 Admin API |
| MANAGER | 매니저 | 중간 권한 Admin API |
| ADMIN | 관리자 | 대부분 Admin API |
| SUPER_ADMIN | 최고 관리자 | 모든 Admin API (ADMIN으로 정규화) |
| SUPERADMIN | 특수 권한 | CSV Import 등 특수 기능 |

### 9.2 권한 검증 우선순위

```
1. JWT roles[] claim → 첫 번째 값 사용
2. JWT role claim → 단일 값 사용
3. AdminUserProfile.tags → ROLE_* 패턴 검색
4. 없으면 → 403 ADMIN_REQUIRED
```

### 9.3 Admin API 보호

- 모든 `/api/v2/admin/*` 경로에 `get_current_admin_info()` 적용
- `SUPER_ADMIN` → `ADMIN`으로 정규화
- 권한 거부 시 RBAC_DENIED 이벤트 기록

---

## 10. 세션/디바이스 관리

### 10.1 현재 상태 (Stateless JWT)

- Redis 미사용
- 서버 측 세션 상태 없음
- 토큰 블랙리스트: DB 기반 (v2_user_refresh_token.revoked_at)

### 10.2 미래 확장 (Redis 세션)

```
Key: auth:session:{user_id}:{jti}
Value: { device_info, ip, user_agent, last_active }
TTL: Access Token 만료 (15분)
```

### 10.3 미래 확장 (디바이스 관리)

```sql
CREATE TABLE v2_user_device (
    id INT PRIMARY KEY,
    user_id INT NOT NULL,
    device_id VARCHAR(64) UNIQUE,  -- FE 생성
    device_type ENUM('WEB', 'IOS', 'ANDROID', 'TELEGRAM'),
    last_login_at DATETIME,
    fcm_token VARCHAR(255)  -- 푸시 알림
);
```

---

## 11. 감사 로그 정책

### 11.1 기록 대상 이벤트

| 이벤트 | 기록 데이터 | 보존 기간 |
|--------|-----------|----------|
| LOGIN_SUCCESS | user_id, ip, user_agent, telegram_id | 90일 |
| LOGIN_FAILED | ip, user_agent, error_message | 90일 |
| LOGOUT | user_id | 90일 |
| TOKEN_REFRESH | user_id | 30일 |
| TELEGRAM_LINK | user_id, telegram_id | 90일 |
| TELEGRAM_UNLINK | user_id, telegram_id | 90일 |
| RBAC_DENIED | user_id, ip, error_message | 90일 |

### 11.2 DB 스키마 (신규)

```sql
CREATE TABLE v2_user_auth_event (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    event_type ENUM(...) NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    telegram_id BIGINT,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);
```

### 11.3 보존/압축 정책

- 보존 기간: 기본 90일
- 압축: 30일 이상 로그는 월별 아카이브
- 삭제: 90일 이후 자동 삭제 (배치 작업)

---

## 12. 9개 도메인별 영향 요약

| 도메인 | 영향도 | 주요 변경 | 비고 |
|--------|-------|----------|------|
| **User** | 🔴 높음 | v2_user_auth_event, v2_user_refresh_token 테이블 추가 | Migration 필요 |
| **Vault** | 🟡 중간 | 로그인 후 잔액 동기화 확인 | 기존 로직 유지 |
| **Mission** | 🟡 중간 | LOGIN 미션 트리거 확인 (09:00 KST 리셋) | 기존 구현됨 |
| **Admin** | 🟡 중간 | RBAC 거부 시 이벤트 로깅 추가 | get_current_admin_info 확장 |
| **Game** | 🟢 낮음 | 없음 | JWT 의존성만 |
| **Shop** | 🟢 낮음 | 없음 | JWT 의존성만 |
| **Inventory** | 🟢 낮음 | 없음 | JWT 의존성만 |
| **Level** | 🟢 낮음 | 없음 | JWT 의존성만 |
| **TeamBattle** | 🟢 낮음 | 없음 | JWT 의존성만 |

---

## 13. 자동화/운영 체크리스트

### 배포 전 필수

- [ ] `TELEGRAM_BOT_TOKEN` 환경변수 설정
- [ ] `JWT_SECRET` 환경변수 설정 (충분히 긴 랜덤 문자열)
- [ ] `DEV_LOGIN_ENABLED=false` (PROD)
- [ ] `TEST_MODE=false` (PROD)
- [ ] v2_user_auth_event 테이블 Migration 완료
- [ ] v2_user_refresh_token 테이블 Migration 완료

### 기능 검증

- [ ] Telegram 신규 유저 생성 → 이벤트 기록 확인
- [ ] Telegram 기존 유저 로그인 → last_login_at 갱신 확인
- [ ] Telegram 링크 코드 연동 → TELEGRAM_LINK 이벤트 확인
- [ ] DEV 로그인 (DEV 환경) → 성공 확인
- [ ] DEV 로그인 (PROD 환경) → 403 확인
- [ ] Access Token 15분 후 만료 → 401 확인
- [ ] Refresh Token으로 갱신 → 새 Access Token 확인
- [ ] 로그아웃 → Refresh Token 무효화 확인
- [ ] Admin API RBAC 검증 → 권한 없으면 403 확인
- [ ] LOGIN 미션 진행 → 09:00 KST 리셋 확인

### 모니터링 지표

- 로그인 성공률: `LOGIN_SUCCESS / (LOGIN_SUCCESS + LOGIN_FAILED)`
- Telegram 검증 실패율: `hash 검증 실패 / 전체 Telegram 인증`
- Token 갱신율: `TOKEN_REFRESH / 활성 유저`
- RBAC 거부율: `RBAC_DENIED / Admin API 호출`

### 알림 임계값

| 지표 | 경고 | 긴급 |
|------|------|------|
| 로그인 실패율 | > 10% | > 30% |
| Telegram 검증 실패율 | > 3% | > 10% |
| Token 갱신 실패율 | > 1% | > 5% |

---

## 14. 구현 현황 (2026-01-29 기준)

### ✅ P0 완료 (MVP 전 필수)

1. **Telegram initData hash 비교** ✅
   - 파일: `app/v2/core/telegram.py`
   - `hmac.compare_digest(calculated_hash, hash_val)` 구현
   - 순수 V2 구현 (V1 User 테이블 미사용)

2. **Auth Event 로깅** ✅
   - 모델: `app/v2/models/auth_event.py`
   - 서비스: `app/v2/services/auth_service.py::log_auth_event()`
   - DB Migration: `alembic/versions/20260128_1800_add_v2_auth_tables.py`

3. **Refresh Token 구현** ✅
   - 모델: `app/v2/models/refresh_token.py`
   - 서비스: `app/v2/services/auth_service.py::V2AuthService`
   - API: `app/v2/api/auth_routes.py` (/refresh, /logout)
   - 30일 sliding window, 7일 미만 시 자동 갱신

4. **Telegram 인증 엔드포인트** ✅
   - 파일: `app/v2/api/telegram_routes.py`
   - 엔드포인트: `POST /api/v2/telegram/auth`
   - 순수 V2User 기반 (V1 의존성 완전 제거)

### ✅ P1 완료

5. **Activity 경로 불일치** ✅
   - V1: `/api/activity/record` (기존 유지)
   - V2: `/api/v2/activity/ingest` + `/api/v2/activity/record` (별칭 추가)
   - 파일: `app/v2/api/activity_routes.py`

### 📁 구현된 파일 목록

```
app/v2/core/
├── __init__.py
└── telegram.py          # initData 검증 (hash 비교 포함)

app/v2/models/
├── auth_event.py        # V2UserAuthEvent, AuthEventType
└── refresh_token.py     # V2UserRefreshToken

app/v2/api/
├── telegram_routes.py   # POST /api/v2/telegram/auth (순수 V2)
└── auth_routes.py       # /refresh, /logout 엔드포인트

app/v2/services/
└── auth_service.py      # log_auth_event, V2AuthService 확장

alembic/versions/
└── 20260128_1800_add_v2_auth_tables.py  # DB Migration
```

---
단위 테스트 결과 (14개 통과)

tests/v2/test_telegram_auth.py - 14 passed
테스트 도구
파일	설명
tests/v2/test_telegram_auth.py	initData 생성/검증 단위 테스트
scripts/generate_test_init_data.py	수동 테스트용 initData 생성 스크립트
사용법

# 단위 테스트 실행
python -m pytest tests/v2/test_telegram_auth.py -v

# initData 생성 (수동 테스트용)
python scripts/generate_test_init_data.py --verify

# 특정 user_id로 생성
python scripts/generate_test_init_data.py --user-id 123456 --username "my_user" --verify

# 추천인 코드 포함
python scripts/generate_test_init_data.py --start-param "ref_999" --verify
API 테스트 (서버 실행 후)

curl -X POST http://localhost:8000/api/v2/telegram/auth \
  -H "Content-Type: application/json" \
  -d '{"init_data": "<생성된_init_data>"}'


---


## 15. 변경 이력

| 버전 | 일자 | 작성자 | 내용 |
|------|------|--------|------|
| v1.0 | 2026-01-28 | GitHub Copilot | 최초 작성, 긴급 패치 항목 식별 |
| v1.1 | 2026-01-29 | GitHub Copilot | P0 항목 모두 구현 완료, V1 의존성 완전 제거 |
