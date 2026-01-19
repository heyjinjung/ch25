문서 타입: API 계약
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/기획
상태: SoT

# V2 Auth & User API 계약

## 1. 목적 (Purpose)
웹 우선 개발(Web-First)을 위한 인증/유저 API 계약을 정의한다.

## 2. 범위 (Scope)
- 토큰 발급
- 활동 기록
- 텔레그램 연동/해제
- 신규 유저 온보딩
- DevLogin (개발환경 한정)

## 3. API 계약 (Contract)
### 3.1 토큰 발급
- Endpoint: `POST /api/auth/token`
- Request:
```json
{
  "user_id": 123,
  "external_id": "cc_123",
  "password": "optional"
}
```
- Response:
```json
{
  "access_token": "jwt...",
  "token_type": "bearer",
  "user": {
    "id": 123,
    "external_id": "cc_123",
    "nickname": "nick",
    "status": "ACTIVE",
    "level": 1,
    "segment": "NEW",
    "telegram_id": 123456789,
    "login_streak": 3
  }
}
```

### 3.2 활동 기록
- Endpoint: `POST /api/activity/record`
- Request:
```json
{
  "event_type": "ROULETTE_PLAY",
  "event_id": "uuid",
  "value": 10,
  "meta_json": {"source": "web"}
}
```
- Response:
```json
{
  "user_id": 123,
  "updated_at": "2026-01-19T12:00:00"
}
```

### 3.3 텔레그램 연동
- Endpoint: `POST /api/telegram/auth`
- Request:
```json
{
  "init_data": "...",
  "start_param": "optional"
}
```
- Response:
```json
{
  "access_token": "jwt...",
  "token_type": "bearer",
  "is_new_user": false,
  "linked_to_existing": true,
  "user": {
    "id": 123,
    "external_id": "cc_123",
    "nickname": "nick",
    "status": "ACTIVE",
    "level": 1,
    "segment": "NEW",
    "telegram_id": 123456789
  }
}
```

### 3.4 텔레그램 링크용 토큰 발급
- Endpoint: `POST /api/telegram/link-token`
- Response:
```json
{
  "expires_at_utc": "2026-01-19T12:00:00Z",
  "start_param": "token",
  "open_url": "https://t.me/..."
}
```

### 3.5 텔레그램 연결 해제 요청
- Endpoint: `POST /api/telegram/unlink-request`
- Request:
```json
{
  "init_data": "..."
}
```

### 3.6 신규 유저 상태/웰컴 보상
- Endpoint: `GET /api/new-user/status`
- Endpoint: `POST /api/new-user/claim-welcome`

### 3.7 DevLogin (개발환경)
- Endpoint: `POST /api/v2/dev/login`
- Request:
```json
{
  "external_id": "dev_web_user",
  "nickname": "Web Dev User",
  "create_if_missing": true
}
```

## 4. 오류 규칙 (Errors)
- `USER_NOT_FOUND`
- `INVALID_CREDENTIALS`
- `DEV_LOGIN_DISABLED`

## 5. 비고 (Notes)
- 본 문서는 V2 웹 개발을 위한 계약이며, 텔레그램 인증은 V1과 호환 유지.

## 6. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
