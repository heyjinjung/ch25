문서 타입: learned_ 정합성 체크
버전: v1.1
작성일: 2026-01-26
수정일: 2026-02-06
작성자: GitHub Copilot
대상: BE/FE/운영
상태: 운영 점검 필요 🟡

[최종 검토일: 2026-02-06]
정책 최신화 필요 여부: 🟡 업데이트 필요 (활동 기록 경로, DEV 로그인 라우터 노출)

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

# Auth 영역 SoT-코드-운영-DB-프론트 매핑 표 (관리자 친화형)

## 1. 인증 정책/핵심 Enum/상수/제약조건

### [A] 주요 DB 컬럼/제약조건/Enum
| DB 테이블/컬럼                | 제약조건/Enum/설명                                   | 정책/코드/프론트 매핑 필드명         | 비고 |
|-------------------------------|------------------------------------------------------|--------------------------------------|------|
| v2_user.id                    | PK, UNIQUE                                           | user_id                              | 🟢 정합 (V2 PK) |
| v2_user.cc_id                 | UNIQUE, NOT NULL                                     | cc_id / external_id                  | 🟢 정합 (V2 인증 키) |
| v2_user.telegram_id           | UNIQUE, NULL                                         | telegram_id                          | 🟢 정합 (텔레그램 인증 키) |
| v2_user_auth_event.user_id    | INDEX (물리 FK 없음)                                 | user_id                              | 🟢 정합 (LOGIN_FAILED=0 대응) |
| v2_user_refresh_token.jti     | UNIQUE                                               | jti                                  | 🟢 정합 (Refresh Token 추적) |
| (기타 FK/UNIQUE/ENUM)         | (각 테이블별로 명시)                                 |                                      |      |

### [B] 프론트-백엔드-DB-코드-정책 1:1 매핑 구조
| 정책/문서           | 실제 코드/Enum/상수         | DB 컬럼/제약조건                | 프론트 필드명         | 비고 |
|---------------------|-----------------------------|----------------------------------|----------------------|------|
| v2_telegram_auth_sot_ko.md | Telegram initData 검증/토큰 발급/이벤트 로깅 | v2_user_auth_event, v2_user_refresh_token | - | 🟢 정합 (V2 구현 완료) |
| v2_auth_user_api_contract_ko.md | `POST /api/v2/auth/token` | - | authApi | 🟢 정합 |
| activityApi.ts | `POST /api/activity/record` 호출 | - | activityApi | 🔴 [정책/구현 충돌] BE는 `/api/v2/activity/record`만 제공 |

---

## 2. 인증 정책
| 구분         | SoT 문서/정책/스키마                | SoT 한글 설명/핵심값/상수/필드         | 실제 코드/핵심 파일                | 운영 상태/테스트/DB/엔드포인트         | DB 적용값 | V1 폐기 | V2 이관 | FE 라우팅 | FE 표시값 | 최신화 일자 | 검증 결과 | 비고 |
|--------------|--------------------------------------|------------------------------------------|-------------------------------------|----------------------------------------|-----------|---------|---------|-----------|-----------|-------------|-----------|------|
| 인증 정책    | v2_telegram_auth_sot_ko.md     | "Telegram initData 인증 + Access/Refresh + 이벤트 로깅" | app/v2/api/auth_routes.py, app/v2/api/telegram_routes.py | /api/v2/auth/*, /api/v2/telegram/auth  |           |         | ✅ 이관 | /login    | 로그인    | 2026-02-06  | 🟡 점검 필요 | DEV 로그인 라우트는 코드에 있으나 라우터 등록 누락 가능 |

## 3. 인증 DB/토큰
| 구분         | SoT 문서/정책/스키마                | SoT 한글 설명/핵심값/상수/필드         | 실제 코드/핵심 파일                | 운영 상태/테스트/DB/엔드포인트         | DB 적용값 | V1 폐기 | V2 이관 | FE 라우팅 | FE 표시값 | 최신화 일자 | 검증 결과 | 비고 |
|--------------|--------------------------------------|------------------------------------------|-------------------------------------|----------------------------------------|-----------|---------|---------|-----------|-----------|-------------|-----------|------|
| 인증 DB/토큰 | v2_telegram_auth_sot_ko.md     | "DB: v2_user_refresh_token, v2_user_auth_event" | app/v2/services/auth_service.py      | /api/v2/auth/token, /api/v2/auth/refresh, /api/v2/auth/logout |           |         | ✅ 이관 |         |           | 2026-02-06  | 🟢 확인 | Access(기본 15분)은 `V2_ACCESS_TOKEN_EXPIRE_MINUTES` 사용 |

## 4. 인증 상수/Enum
| 구분         | SoT 문서/정책/스키마                | SoT 한글 설명/핵심값/상수/필드         | 실제 코드/핵심 파일                | 운영 상태/테스트/DB/엔드포인트         | DB 적용값 | V1 폐기 | V2 이관 | FE 라우팅 | FE 표시값 | 최신화 일자 | 검증 결과 | 비고 |
|--------------|--------------------------------------|------------------------------------------|-------------------------------------|----------------------------------------|-----------|---------|---------|-----------|-----------|-------------|-----------|------|
| 인증 상수/Enum| v2_telegram_auth_sot_ko.md     | "상수: DEV_LOGIN_ENABLED, V2_ACCESS_TOKEN_EXPIRE_MINUTES, Enum: AuthEventType" | app/core/config.py, app/v2/models/auth_event.py | DB: v2_user_auth_event, v2_user_refresh_token |           |         | ✅ 이관 |         |           | 2026-02-06  | 🟢 확인 | DEV 로그인 플래그/만료시간 분리 구현 |

<!-- 각 그룹별로 SoT 한글 설명/핵심값/상수/필드가 명확히 들어가도록 작성, 최신화/검증 결과/비고는 수동 또는 자동화 스크립트로 채움 -->

<!-- 각 그룹별로 SoT 한글 설명/핵심값/상수/필드가 명확히 들어가도록 작성, 최신화/검증 결과/비고는 수동 또는 자동화 스크립트로 채움 -->

## 3. 정합성 검증 요약 리포트 (Rounds 1-3)

| 차수 | 주요 검증 결과 | 상태 | 이모지 요약 |
| :--- | :--- | :--- | :--- |
| **1차** | 인증 정책(v2_pre_release) 및 기본 토큰 발급 로직 검증 완료 | 🟢 정합 | ✅🟢 |
| **2차** | Dev Login 환경 제한 및 JWT Role 클레임(`role`, `roles`) 정합성 확인 | 🟢 정합 | ✅🟢 |
| **3차** | **(과거 이슈) 인증 내역(Auth Event) 및 설정 플래그 불일치** | ✅ 해결 | ✅🟢 |
| **4차** | **(현재 이슈) FE 활동 기록 경로 불일치** (`/api/activity/record` vs `/api/v2/activity/record`) | 🔴 충돌/누락 | ❌🔴 |

## 4. 정합성 검증 상세 리포트 (Updated 2026-02-06)

- **상태**: 🟡 **일부 업데이트 필요 (활동 로그 경로, DEV 로그인 노출 상태 점검)**
- **주요 발견 사항**:
    - 🟢 [정책/구현 일치]: `/api/v2/auth/token`은 Access+Refresh를 발급하고, `v2_user_auth_event`에 LOGIN_SUCCESS/FAILED를 기록함.
    - 🟢 [API 계약 준수]: `AuthUser.vault_locked_balance`는 V2 금고 SoT를 준수함.
    - 🟢 [JWT Claims]: `app/core/security.py`가 `role`, `roles` 클레임을 지원하여 Admin RBAC 기반 마련됨.
    - 🔴 [정책/구현 충돌]: **활동 기록 경로 불일치**.
        - FE는 `/api/activity/record`를 호출.
        - BE V2는 `/api/v2/activity/record`만 제공.
        - 결과: 동일 오리진 구성(nginx)에서는 404 위험.
- **조치 사항**:
    - 🔴 [긴급]: FE 활동 기록 엔드포인트를 `/api/v2/activity/record`로 변경하거나, BE에 `/api/activity/record` 별칭 라우터를 추가.
    - 🟡 [모니터링]: DEV 로그인은 `DEV_LOGIN_ENABLED`로 차단되도록 설정하되, 현재 라우터 include 여부를 코드로 재확인 필요.

## 5. 코드베이스 실전영역 체크 리포트 (Step 3-3)

- **검증 일시**: 2026-01-26
- **검증 대상**: `app/v2/api/dev_login.py`, `app/v2/api/auth_routes.py`, `src/v2/pages/auth/V2UserLoginPage.tsx`, `src/api/activityApi.ts`
- **주요 발견 사항**:
    - 🔴 **[API 경로 불일치] 활동 기록**: 
        - FE(`activityApi.ts`)는 `/api/activity/record`를 호출하나, BE(`activity_routes.py`)는 `/api/v2/activity/ingest`로 정의되어 있음. 
        - **결과**: 현재 프론트엔드 활동 기록 기능 동작 불가 (404 예상).
    - 🟡 **[파일명/문서 부정합]**: 
        - SoT에서는 핵심 파일을 `app/v2/api/auth.py`로 명시하나, 실제 파일명은 `auth_routes.py`임. 문서 업데이트 필요.
    - 🟢 **[환경 변수/설정]**: `DEV_LOGIN_ENABLED`는 `app/core/config.py`에 존재하며, V2 Access 만료는 `V2_ACCESS_TOKEN_EXPIRE_MINUTES`를 사용함.
    - 🟢 **[로그인 기능 정합]**: 
        - `V2TelegramLoginPage.tsx`(프로덕션) / `V2TelegramTestLoginPage.tsx`(테스트) 라우팅 존재.
    - 🟡 **[DEV 로그인 노출 점검]**:
        - `app/v2/api/dev_login.py` 파일은 존재하나, `app/v2/api/routes.py`에 include가 누락되어 실제 엔드포인트가 비활성일 수 있음.
    - 🔴 **[Critical] 활동 기록 경로 불일치**:
        - FE(`/api/activity/record`) vs BE(`/api/v2/activity/record`).
- **최종 결론**: **🔴 부분 업데이트 필요**. 인증(토큰/이벤트/미션 트리거)은 정합하나, 활동 기록 경로 불일치와 DEV 로그인 엔드포인트 노출 상태를 정리해야 함.


<!-- 각 그룹별로 SoT 한글 설명/핵심값/상수/필드가 명확히 들어가도록 작성, 최신화/검증 결과/비고는 수동 또는 자동화 스크립트로 채움 -->
