[최종 검토일: 2026-01-26]
정책 최신화 필요 여부: 🔴 업데이트 필요 (인증 내역/활동 로그 구현 누락)

## 정책 정합성/충돌 처리 원칙
- SoT-코드-운영-DB-프론트 매핑에서 부정합/충돌 발견 시 아래와 같이 명시:
  - 🔴 [정책/구현 충돌]: 구체적 내용, 우선 기준, 임시 조치/추후 액션 명시
  - 🟡 [정합성 검토 필요]: 불일치/불명확/운영상 임시 허용 등
- 근거/판단 기준(SoT/코드/운영/DB/프론트 우선 등) 및 작성일/정책 문서/운영 사례 등 명확히 기입
- 즉시 수정 불가 시 "임시 예외", "운영상 임시 허용", "추후 일괄 정비 필요" 등 TODO로 남김
- 자동화/운영 체크리스트에 해당 부정합이 감지되도록 추가
- 실제 장애/오류/운영 리스크 시 "운영자 주의", "긴급 패치 필요", "QA 우선 검증" 등 강조

## 자동화/운영 체크리스트 & TODO
- [ ] SoT-코드-운영-DB-프론트 매핑 1:1 정합성 검증 자동화 필요
- [ ] FK/UNIQUE/ENUM/권한 정책 등 제약조건 자동 점검
- [ ] 인증/인가/세션 관리 실시간 점검 및 운영자 알림 연동
- [ ] 정책/구현/운영 불일치 발견 시 즉시 표기 및 TODO/임시 예외 명시
- [ ] 최신 정책/운영 사례 반영 주기적 검토(작성일/최종 검토일 갱신)
#
...existing code...
# Auth 영역 SoT-코드-운영-DB-프론트 매핑 표 (관리자 친화형)

## 1. 인증 정책/핵심 Enum/상수/제약조건

### [A] 주요 DB 컬럼/제약조건/Enum
| DB 테이블/컬럼                | 제약조건/Enum/설명                                   | 정책/코드/프론트 매핑 필드명         | 비고 |
|-------------------------------|------------------------------------------------------|--------------------------------------|------|
| user.id                       | PK, UNIQUE                                           | user_id                              | FK 참조시 주의 |
| user_auth.user_id             | FK(user.id)                                          | user_id                              | FK 제약조건 |
| user_auth.provider            | ENUM(AuthProviderType)                               | AuthProviderType, provider           | Enum/케이스 주의 |
| access_token.user_id          | FK(user.id)                                          | user_id                              | FK 제약조건 |
| (기타 FK/UNIQUE/ENUM)         | (각 테이블별로 명시)                                 |                                      |      |

### [B] 프론트-백엔드-DB-코드-정책 1:1 매핑 구조
| 정책/문서           | 실제 코드/Enum/상수         | DB 컬럼/제약조건                | 프론트 필드명         | 비고 |
|---------------------|-----------------------------|----------------------------------|----------------------|------|
| v2_pre_release_auth_policy_ko.md | AuthProviderType, DEV_LOGIN_ENABLED | user_auth.provider | provider | Enum/케이스 일치 필수 |

---

## 2. 인증 정책
| 구분         | SoT 문서/정책/스키마                | SoT 한글 설명/핵심값/상수/필드         | 실제 코드/핵심 파일                | 운영 상태/테스트/DB/엔드포인트         | DB 적용값 | V1 폐기 | V2 이관 | FE 라우팅 | FE 표시값 | 최신화 일자 | 검증 결과 | 비고 |
|--------------|--------------------------------------|------------------------------------------|-------------------------------------|----------------------------------------|-----------|---------|---------|-----------|-----------|-------------|-----------|------|
| 인증 정책    | v2_pre_release_auth_policy_ko.md     | "DEV 환경 external_id 로그인 허용, 비밀번호 미사용, 토큰 발급 정책, 엔드포인트: /api/v2/dev/login" | app/v2/api/auth.py                  | /api/v2/auth/*, /api/v2/dev/login      |           |         | ✅ 이관 | /login    | 로그인    | 2026-01-26  | ✅ 완료 | Pre-Release 정책 준수 확인 (dev_login.py) |

## 3. 인증 DB/토큰
| 구분         | SoT 문서/정책/스키마                | SoT 한글 설명/핵심값/상수/필드         | 실제 코드/핵심 파일                | 운영 상태/테스트/DB/엔드포인트         | DB 적용값 | V1 폐기 | V2 이관 | FE 라우팅 | FE 표시값 | 최신화 일자 | 검증 결과 | 비고 |
|--------------|--------------------------------------|------------------------------------------|-------------------------------------|----------------------------------------|-----------|---------|---------|-----------|-----------|-------------|-----------|------|
| 인증 DB/토큰 | v2_pre_release_auth_policy_ko.md     | "DB: user, user_auth, access_token 발급/검증, external_id 기반 매칭" | app/v2/services/auth_service.py      | 테스트: test_auth_service.py           |           |         | ✅ 이관 |         |           | 2026-01-26  | ✅ 완료 | DB 스키마 및 Token 유효성 검증 완료 |

## 4. 인증 상수/Enum
| 구분         | SoT 문서/정책/스키마                | SoT 한글 설명/핵심값/상수/필드         | 실제 코드/핵심 파일                | 운영 상태/테스트/DB/엔드포인트         | DB 적용값 | V1 폐기 | V2 이관 | FE 라우팅 | FE 표시값 | 최신화 일자 | 검증 결과 | 비고 |
|--------------|--------------------------------------|------------------------------------------|-------------------------------------|----------------------------------------|-----------|---------|---------|-----------|-----------|-------------|-----------|------|
| 인증 상수/Enum| v2_pre_release_auth_policy_ko.md     | "상수: DEV_LOGIN_ENABLED, Enum: AuthProviderType, 필드: external_id, access_token" | app/v2/services/auth_service.py      | DB: user, user_auth                   |           |         | ✅ 이관 |         |           | 2026-01-26  | ✅ 완료 | AuthProviderType Enum 정합성 확인 |

<!-- 각 그룹별로 SoT 한글 설명/핵심값/상수/필드가 명확히 들어가도록 작성, 최신화/검증 결과/비고는 수동 또는 자동화 스크립트로 채움 -->

## 3. 정합성 검증 요약 리포트 (Step 2-2)

- **상태**: 🟢 **정합 (Validated)**
- **주요 발견 사항**:
    - 🟢 [정책/구현 일치]: `v2_pre_release_auth_policy_ko.md`의 "DEV 로그인 환경 제한" 정책이 `dev_login.py` (Line 40: `env in ["local", "development", "dev"]`)에 정확히 구현됨.
    - 🟢 [API 계약 준수]: `/api/auth/token` (v2_issue_token) 응답 스키마가 `AuthUser` 모델을 통해 `vault_locked_balance` SoT를 준수함.
    - 🟢 [JWT Claims]: `app/core/security.py`가 `role`, `roles` 클레임을 지원하여 Admin RBAC 기반 마련됨.
    - 🔴 [정책/구현 충돌]: **인증 내역(Auth History) 구현 누락**. 
        - SoT(`v2_auth_user_api_contract_ko.md`)에는 `/api/activity/record` 활동 기록 API가 정의되어 있으나, 실제 `activity_routes.py`는 **Mock 응답**만 반환함.
        - V1(`app/api/routes/auth.py`)과 달리 V2 Auth(`dev_login.py`, `auth_service.py`)에 **로그인 이벤트 적재(`UserEventLog`) 로직이 전무함**.
- **조치 사항**:
    - 🔴 [긴급]: `V2AuthService` 및 `dev_login` 성공 시 `UserEventLog` (또는 유력한 V2용 신규 로그 테이블) 적재 로직 추가 필수.
    - 🟡 [모니터링]: Prod 환경 배포 시 `DEV_LOGIN_DISABLED` 예외가 정상 발생하여 Dev Login이 차단되는지 스모크 테스트 필요.

## 4. 실전 코드 검증 리포트 (Step 3-3)

- **검증 대상**: `app/v2/api/dev_login.py`, `app/v2/api/auth_routes.py`, `app/core/security.py`
- **검증 일시**: 2026-01-26
- **주요 발견 사항**:
    - 🟢 [Dev Login]: `create_if_missing` 파라미터(Boolean)에 따라 신규 유저 생성 여부를 제어하는 로직이 정상 구현됨 (`V2UserService.create_user`).
    - 🟢 [Legacy 호환]: `v2_issue_token`에서 `V2UserService.ensure_legacy_user_id`를 호출하여 V1/V2 ID 매핑을 보장함.
    - 🟢 [Route Prefix]: `dev_login.py`가 `/api/v2/dev` prefix를 사용하여 일반 Auth (`/auth`)와 명확히 분리됨.
    - 🔴 **[Critical] 인증 내역/활동 로그 누락**:
        - `V2AuthService.issue_token` 및 `dev_login` 내부에서 유저 로그인 성공 기록을 DB에 남기는 코드가 발견되지 않음.
        - `/activity/ingest` (Mock) 및 `/api/activity/record` (정의만 존재) 간의 명칭 및 구현 불일치 존재.
- **최종 결론**: **🟡 조건부 배포 가능 (인증 내역 기능 누락 확인)**. 기본적인 토큰 발급 및 보안 정책(JWT/Env)은 정합하나, 유저 활동 추적/인증 내역(Auth History) 기능이 V1 대비 퇴보(Mock)되어 있어 조속한 구현 보완이 필요함.


<!-- 각 그룹별로 SoT 한글 설명/핵심값/상수/필드가 명확히 들어가도록 작성, 최신화/검증 결과/비고는 수동 또는 자동화 스크립트로 채움 -->
