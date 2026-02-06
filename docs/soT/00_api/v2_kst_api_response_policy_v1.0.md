# V2 API KST 응답 표기 정책

문서 타입: 가이드
버전: v1.1
작성일: 2026-01-24
작성자: GitHub Copilot
대상 독자: BE/FE/운영
상태: Draft

## 1. 목적
V2 전 영역의 API 응답 datetime을 KST로 통일 표기하여 운영 혼선을 방지한다.

## 2. 범위
- CC입금
- 게임로직
- 보상
- 미션
- 금고출금
- 팀배틀
- 운영로그
- 유저생성/유저로그인/가입일시

## 3. 용어 정의
- UTC 저장: DB에 저장되는 기준 시간(기본적으로 UTC).
- KST 표기: API 응답에서 `Asia/Seoul` 기준으로 변환된 시간 표기.
- 응답 계층: API 스키마/serializer 수준에서의 변환.

## 4. 정책 (필수)
### 4.1 원칙
1) DB 저장은 UTC 유지(변경 없음).
2) **API 응답은 전부 KST로 변환하여 표기**한다.
3) 표기 형식은 ISO 8601, 타임존 오프셋 포함 `+09:00`.

### 4.2 변환 기준
- `created_at`, `updated_at`, `last_login_at`, `first_login_at`, `vault_locked_expires_at` 등 모든 datetime 필드는 응답 시 KST로 변환.
- 집계 기준일(예: 일간 리포트, 금고/입금 집계)은 KST 기준일을 사용.

### 4.3 적용 대상 엔드포인트(대표)
- CC입금: `/api/v2/admin/cc-deposit*`
- 게임: `/api/v2/*/play`, `/api/v2/*/status`
- 보상/금고: `/api/v2/vault/*`, `/api/v2/reward/*`
- 미션: `/api/v2/mission/*`
- 팀배틀: `/api/v2/team-battle/*`
- 운영로그: `/api/v2/admin/*` (audit/log 조회 포함)
- 유저: `/api/v2/user/*`, `/api/v2/auth/*`

## 5. 구현 가이드
- Pydantic 응답 스키마에서 KST 변환을 강제한다.
- 공통 BaseModel을 사용해 응답 시점 변환을 일관화한다.
- Naive datetime은 UTC로 간주 후 KST 변환한다.

### 5.1 적용 상태
- 전역 JSON 응답에서 datetime을 KST로 직렬화하도록 기본 응답 클래스를 설정한다.
- 공통 변환 유틸: [app/schemas/base.py](app/schemas/base.py)
- 응답 기본 클래스 설정: [app/main.py](app/main.py)

## 6. QA/검증 체크리스트
- [ ] 모든 API 응답의 datetime이 `+09:00` 오프셋을 포함하는지 확인
- [ ] UTC 저장값과 KST 응답값이 9시간 차이로 일치하는지 확인
- [ ] 운영 로그/리포트 조회도 KST 표기인지 확인

## 7. 변경 이력
- v1.1 (2026-01-24, GitHub Copilot): 전역 KST 응답 적용 상태 추가
- v1.0 (2026-01-24, GitHub Copilot): 최초 작성
