문서 타입: learned_ 패치 노트
버전: v1.1
작성일: 2026-01-29
수정일: 2026-02-06
작성자: GitHub Copilot
대상: BE/FE/QA
상태: 적용 완료 ✅ (문서 정합 갱신)

---

# 2026-01-29 V2 인증 신뢰성 및 정합성 업데이트

## 1. 배경
V2 인증 시스템의 SOT(단일 원천) 정책과 실제 `auth_routes.py` 코드 간의 불일치를 해소하고, 인증 감사 로그 및 미션 연동의 신뢰성을 강화함.

## 2. 주요 변경 사항

### [A] 이중 토큰 발급 정책 (Access + Refresh) 구현
- **기존**: `v2_issue_token` 및 `v2_login`에서 Access Token만 발급하던 문제를 수정.
- **변경**: `V2AuthService.issue_v2_tokens`를 통해 Access Token(15분)과 Refresh Token(30일)을 동시에 발급하도록 개선.
- **대상 파일**:
    - `app/v2/api/auth_routes.py`
    - `app/v2/services/auth_service.py`
    - `app/v2/schemas/v2_auth.py` (Response 스키마에 `refresh_token` 추가)

### [B] 인증 이벤트(Auth Event) 로깅 적용
- **내용**: 로그인 성공 및 실패 시 `v2_user_auth_event` 테이블에 로그를 기록하여 감사 추적성을 확보.
- **기록 항목**: IP 주소, User-Agent, 성공 여부, 에러 메시지(실패 시).
- **대상 파일**: `app/v2/api/auth_routes.py`

### [C] 미션 연동 로직 단일화
- **내용**: 로그인 시 발생하는 미션 트리거 로직을 `V2MissionService.ensure_login_progress`로 캡슐화하여 `telegram_routes.py`와 `auth_routes.py` 간의 정합성 유지.
- **대상 파일**: `app/v2/services/mission_service.py`

## 3. 검증 결과
- **단위 테스트**: `tests/v2/test_telegram_auth_api.py` (10 passed)
- **확인 항목**:
    - `POST /api/v2/auth/token` 호출 시 `refresh_token` 포함 여부 확인 완료.
    - 로그인 실패 시 `LOGIN_FAILED` 이벤트 DB 기록 확인 완료.
    - 로그인 성공 시 `LOGIN_SUCCESS` 이벤트 및 미션 트리거 확인 완료.

## 4. 향후 계획
- 30일 sliding window 만료 및 자동 갱신 로직(발급 7일 전) 모니터링.

---

## 5. 프론트엔드 로그인 화면(요약)

### 5.1 테스트 로그인 페이지 (정식 배포 전)
- 경로: `/login/test`
- 파일: `src/v2/pages/auth/V2TelegramTestLoginPage.tsx`
- 특징:
    - 초기화 경고 배너
    - 텔레그램 환경: initData 인증 버튼
    - 비텔레그램 환경: CC ID 기반 개발 로그인

### 5.2 프로덕션 텔레그램 로그인 페이지 (정식 배포 후)
- 경로: `/login`
- 파일: `src/v2/pages/auth/V2TelegramLoginPage.tsx`
- 특징:
    - 페이지 로드 시 자동 인증 시도
    - 상태별 UI(로딩 → 성공 → 홈 이동)
    - 실패 시 재시도 제공
    - 비 텔레그램 환경 가드 문구

### 5.3 라우팅 구조

| 경로 | 페이지 | 용도 |
|------|--------|------|
| `/login` | V2TelegramLoginPage | 프로덕션(자동 인증) |
| `/login/test` | V2TelegramTestLoginPage | 테스트(초기화 경고) |
| `/login/dev` | V2UserLoginPage | 개발용(레거시) |

### 5.4 백엔드 연동
- `POST /api/v2/telegram/auth` : initData 기반 인증
- Refresh Token 지원

텔레그램 로그인 화면 2개를 구현했습니다:

1. 테스트 로그인 페이지 (정식 배포 전)
경로: /login/test

파일: V2TelegramTestLoginPage.tsx

특징:

주황색 경고 배너: "정식 오픈 시 전부 초기화" 안내
텔레그램 환경이면 → 자동 인증 버튼
텔레그램 환경 아니면 → 개발 모드 CC ID 로그인
2. 프로덕션 텔레그램 로그인 페이지 (정식 배포 후)
경로: /login

파일: V2TelegramLoginPage.tsx

특징:

자동 인증: 페이지 로드 시 즉시 인증 시도
상태별 UI: 로딩 → 성공 → 홈 이동 (신규 유저 보너스 안내)
에러 처리: 실패 시 재시도 버튼
비 텔레그램 환경: "텔레그램으로 접속해주세요" 안내
라우팅 구조
경로	페이지	용도
/login	V2TelegramLoginPage	프로덕션 (자동 인증)
/login/test	V2TelegramTestLoginPage	테스트 (초기화 경고)
/login/dev	V2UserLoginPage	기존 개발용 (레거시)
백엔드 연동
POST /api/v2/telegram/auth - initData 기반 인증
Refresh Token 지원
HapticFeedback (성공/실패 진동)