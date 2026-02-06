문서 타입: API 계약
버전: v2.0
작성일: 2026-01-30
작성자: GitHub Copilot
대상: BE/FE/QA/운영
상태: SoT

# V2 Auth & User API 계약

## 1. 목적 (Purpose)
V2 인증/유저/텔레그램/활동 기록/온보딩/DevLogin의 상세 계약을 정의한다.

## 2. 범위 (Scope)
- Auth (토큰 발급/갱신/로그아웃)
- Telegram (연동/링크 토큰/연결 해제)
- User (내 정보/잔액)
- Activity (활동 기록)
- New User (온보딩)
- Dev Login (개발환경 전용)
- UI Config (공개 조회)

## 3. 공통 규칙
### 3.1 권한/헤더
- Bearer 토큰 필요: User, Activity, Logout
- 선택적: Today-Feature와 동일한 방식의 Public 호출은 허용하지 않음
- 헤더: `Authorization: Bearer <token>`

### 3.2 공통 에러 코드
- 400: 잘못된 요청
- 401: 인증 필요 (AUTH_REQUIRED)
- 403: 권한 없음
- 404: 리소스 없음
- 422: 유효성 검증 실패
- 500: 서버 오류

## 4. API 상세

### 4.1 토큰 발급
- Method/Path: `POST /api/v2/auth/token`
- Auth: 없음
- Request Schema: `AuthTokenRequest`
- Response Schema: `AuthTokenResponse`
- Example Request:
```json
{ "telegram_id": 123456, "auth_date": "1706432000", "hash": "<hash>" }
```
- Example Response:
```json
{ "access_token": "<token>", "refresh_token": "<token>", "token_type": "bearer" }
```

### 4.2 로그인(alias)
- Method/Path: `POST /api/v2/auth/login`
- Auth: 없음
- Request Schema: `AuthTokenRequest`
- Response Schema: `AuthTokenResponse`
- Example Request/Response: 4.1과 동일

### 4.3 토큰 갱신
- Method/Path: `POST /api/v2/auth/refresh`
- Auth: Bearer
- Request Body: 없음
- Response Schema: `AuthTokenResponse`
- Example Response:
```json
{ "access_token": "<token>", "refresh_token": "<token>", "token_type": "bearer" }
```

### 4.4 로그아웃
- Method/Path: `POST /api/v2/auth/logout`
- Auth: Bearer
- Request Body: 없음
- Response Schema: `LogoutResponse`
- Example Response:
```json
{ "success": true }
```

### 4.5 활동 기록
- Method/Path: `POST /api/v2/activity/record`
- Auth: Bearer
- Request Schema: `ActivityRecordRequest`
- Response Schema: `ActivityRecordResponse`
- Example Request:
```json
{ "event_type": "ROULETTE_PLAY", "event_id": "uuid", "value": 1, "meta_json": {"source": "web"} }
```
- Example Response:
```json
{ "user_id": 123, "updated_at": "2026-01-30T12:00:00+09:00" }
```

### 4.6 텔레그램 연동
- Method/Path: `POST /api/v2/telegram/auth`
- Auth: 없음
- Request Schema: `TelegramAuthRequest`
- Response Schema: `TelegramAuthResponse`
- Example Request:
```json
{ "init_data": "<init_data>", "start_param": "optional" }
```
- Example Response:
```json
{ "access_token": "<token>", "token_type": "bearer", "is_new_user": false, "linked_to_existing": true }
```

### 4.7 텔레그램 링크 토큰 발급
- Method/Path: `POST /api/v2/telegram/link-token`
- Auth: Bearer
- Request Body: 없음
- Response Schema: `TelegramLinkTokenResponse`
- Example Response:
```json
{ "expires_at_utc": "2026-01-30T00:00:00Z", "start_param": "token", "open_url": "https://t.me/..." }
```

### 4.8 텔레그램 연결 해제 요청
- Method/Path: `POST /api/v2/telegram/unlink-request`
- Auth: Bearer
- Request Schema: `TelegramUnlinkRequest`
- Response Schema: 없음
- Example Request:
```json
{ "init_data": "<init_data>" }
```

### 4.9 Dev Login (개발환경)
- Method/Path: `POST /api/v2/dev/login`
- Auth: 없음 (환경 제한)
- Request Schema: `DevLoginRequest`
- Response Schema: 없음
- Example Request:
```json
{ "external_id": "dev_web_user", "nickname": "Web Dev User", "create_if_missing": true }
```

### 4.10 신규 유저 상태
- Method/Path: `GET /api/v2/new-user/status`
- Auth: Bearer
- Response Schema: OpenAPI 미정의
- Example Response:
```json
{ "is_new_user": false }
```

### 4.11 신규 유저 웰컴 보상
- Method/Path: `POST /api/v2/new-user/claim-welcome`
- Auth: Bearer
- Response Schema: OpenAPI 미정의
- Example Response:
```json
{ "claimed": true }
```

### 4.12 내 정보 조회
- Method/Path: `GET /api/v2/user/me`
- Auth: Bearer
- Response Schema: `UserMeResponse`
- Example Response:
```json
{ "id": 1, "nickname": "user", "telegram_id": 123456 }
```

### 4.13 내 잔액 조회
- Method/Path: `GET /api/v2/user/balance`
- Auth: Bearer
- Response Schema: `UserBalanceResponse`
- Example Response:
```json
{ "vault_balance": 0, "ticket_balance": 0 }
```

### 4.14 UI 설정 조회
- Method/Path: `GET /api/v2/ui-config/{key}`
- Auth: 없음
- Parameters: `key` (path)
- Response Schema: `UiConfigResponse`
- Example Response:
```json
{ "key": "v2_shop_products", "value": {"products": []} }
```

## 5. 근거 (Source)
- OpenAPI: [docs/v2_specs/03_api/v2_legacy_openapi.yaml](docs/v2_specs/03_api/v2_legacy_openapi.yaml)
- 라우터:
  - [app/v2/api/auth_routes.py](app/v2/api/auth_routes.py)
  - [app/v2/api/telegram_routes.py](app/v2/api/telegram_routes.py)
  - [app/v2/api/dev_login.py](app/v2/api/dev_login.py)
  - [app/v2/api/user_routes.py](app/v2/api/user_routes.py)
  - [app/v2/api/activity_routes.py](app/v2/api/activity_routes.py)
  - [app/v2/api/v1_auth_user_alias.py](app/v2/api/v1_auth_user_alias.py)
  - [app/v2/api/routes.py](app/v2/api/routes.py)

## 6. 변경 이력
- v2.0 (2026-01-30, GitHub Copilot): V2 경로/스키마 기준 상세 계약으로 전면 교체
