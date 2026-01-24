문서 타입: 테스트 로그 (Auth)
버전: v1.0
작성일: 2026-01-24
작성자: GitHub Copilot
대상 독자: BE/FE/QA/운영

# V2 Full-Stack Integration Test Logs - Auth (2026-01-24)

## 1. 목적 (Purpose)
인증(Authentication) 및 유저 세션 관리 영역의 V2 전 구간 연동 상태를 검증하고 기록한다.

## 2. 검증 항목
| 항목 | FE 진입점 | API 엔드포인트 | 상태 | 증거 |
|---|---|---|---|---|
| 토큰 발급 | /landing | POST /api/v2/auth/token | **PASS** | artifacts/20260124/api/auth_token_response_v2.json |
| Dev 로그인(개발) | /landing | POST /api/v2/dev/login | **PASS** | artifacts/20260124/api/dev_login_response_v2.json |
| 유저 정보 로드 | /landing | GET /api/v2/user/me | todo | - |

## 3. 세부 로그
### 3.1 토큰 발급 (200 OK)
- **현황**: v2 경로(`/api/v2/auth/token`)로 토큰 발급 정상 확인.
- **응답**: `{"access_token": "...", "token_type": "bearer"}`
- **증거**: artifacts/20260124/api/auth_token_response_v2.json

### 3.2 Dev 로그인 (200 OK)
- **현황**: v2 경로(`/api/v2/dev/login`)로 dev 유저 생성/토큰 발급 정상 확인.
- **증거**: artifacts/20260124/api/dev_login_response_v2.json

---
(끝)
