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
    - `POST /auth/token` 호출 시 `refresh_token` 포함 여부 확인 완료.
    - 로그인 실패 시 `LOGIN_FAILED` 이벤트 DB 기록 확인 완료.
    - 로그인 성공 시 `LOGIN_SUCCESS` 이벤트 및 미션 트리거 확인 완료.

## 4. 향후 계획
- 30일 sliding window 만료 및 자동 갱신 로직(발급 7일 전) 모니터링.
