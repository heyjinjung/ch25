문서 타입: API
버전: v1.0
작성일: 2026-01-30
작성자: GitHub Copilot
대상: BE/FE/QA/운영
상태: SoT

# V2 API 통합 계약서

## 1. 목적 (Purpose)
V2 API의 최신 상태를 통합 문서로 정리하여, Swagger/OpenAPI, 엔드포인트 설명, 예제 요청/응답을 제공한다.

## 2. 범위 (Scope)
- System, Auth/User, Game, Mission/Streak, Inventory/Shop, Team Battle, Ticket Zero, Golden, Admin/Ops

## 3. 기준 문서 (Sources)
- OpenAPI (YAML): [docs/v2_specs/03_api/v2_legacy_openapi.yaml](v2_legacy_openapi.yaml)
- OpenAPI (JSON): [docs/v2_specs/03_api/v2_openapi.json](v2_openapi.json)
- System: [docs/v2_specs/03_api/v2_system_api_contract_ko.md](v2_system_api_contract_ko.md)
- Auth/User: [docs/v2_specs/03_api/v2_auth_user_api_contract_ko.md](v2_auth_user_api_contract_ko.md)
- Game: [docs/v2_specs/03_api/v2_game_api_contract_ko.md](v2_game_api_contract_ko.md)
- Mission/Streak: [docs/v2_specs/03_api/v2_mission_streak_api_contract_ko.md](v2_mission_streak_api_contract_ko.md)
- Inventory/Shop: [docs/v2_specs/03_api/v2_inventory_shop_api_contract_ko.md](v2_inventory_shop_api_contract_ko.md)
- Team Battle: [docs/v2_specs/03_api/v2_team_battle_api_contract_ko.md](v2_team_battle_api_contract_ko.md)
- Ticket Zero: [docs/v2_specs/03_api/v2_ticket_zero_api_contract_ko.md](v2_ticket_zero_api_contract_ko.md)
- Golden: [docs/v2_specs/07_golden/v2_golden_api_contract_ko.md](../07_golden/v2_golden_api_contract_ko.md)
- Admin/Ops: [docs/v2_specs/03_api/v2_admin_ops_api_contract_ko.md](v2_admin_ops_api_contract_ko.md)

## 4. 공통 규칙 (Common Rules)
- Base Path: `/api/v2/`
- Auth: `Authorization: Bearer <token>`
- 시간 기준: KST, 오전 9시 리셋

## 5. 대표 엔드포인트 요약 (Endpoint Summary)

| 도메인 | 대표 엔드포인트 | 설명 |
| --- | --- | --- |
| System | `GET /api/v2/health` | 헬스 체크 |
| System | `GET /api/v2/health/db` | DB 헬스 체크 |
| Auth | `POST /api/v2/auth/token` | 토큰 발급 |
| User | `GET /api/v2/user/me` | 내 정보 조회 |
| Mission | `GET /api/v2/mission/` | 미션 목록 |
| Streak | `GET /api/v2/streak/info` | 스트릭 정보 |
| Inventory | `GET /api/v2/inventory` | 인벤토리 조회 |
| Shop | `POST /api/v2/shop/purchase` | 상점 구매 |
| Team Battle | `GET /api/v2/team-battle/seasons` | 시즌 목록 |
| Golden | `GET /api/v2/admin/roi/top-campaigns` | ROI 상위 캠페인 |
| Admin/Ops | `GET /api/v2/admin/users` | 유저 목록 |

## 6. 예제 요청/응답 (Examples)

### 6.1 System Health
- Request:
```http
GET /api/v2/health
```
- Response:
```json
{ "status": "ok" }
```

### 6.2 Health DB
- Request:
```http
GET /api/v2/health/db
```
- Response:
```json
{ "status": "ok" }
```

### 6.3 Auth Token
- Request:
```http
POST /api/v2/auth/token
Content-Type: application/json

{ "telegram_id": 123456, "auth_date": "1706432000", "hash": "<hash>" }
```
- Response:
```json
{ "access_token": "<token>", "refresh_token": "<token>", "token_type": "bearer" }
```

### 6.4 User Me
- Request:
```http
GET /api/v2/user/me
Authorization: Bearer <token>
```
- Response:
```json
{ "id": 1, "nickname": "user", "telegram_id": 123456 }
```

## 7. 변경 이력
- v1.0 (2026-01-30, GitHub Copilot): 통합 API 문서 생성 및 OpenAPI 최신화 반영
