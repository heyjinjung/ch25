문서 타입: API
버전: v1.0
작성일: 2026-01-24
작성자: GitHub Copilot
대상 독자: BE/FE/QA/운영

# V2 API Contract SoT

## 1. 목적 (Purpose)
V2 API 계약의 단일 기준(SoT)을 정의하여, FE/BE 구현과 테스트의 기준점을 제공한다.

## 2. 범위 (Scope)
- 인증/유저, 게임, 미션/스트릭, 인벤토리/상점, 팀배틀, 티켓제로, 골든, 어드민
- 공통 에러 포맷 및 헤더 규칙

## 3. 용어 정의 (Definitions)
- Contract: 요청/응답 스키마와 오류 규칙의 합의
- SoT: 변경 판단의 기준 문서

## 4. SoT 문서 체계 (Hierarchy)
1) OpenAPI (최상위 경로/스키마 기준)
2) 도메인별 계약 문서 (상세 규칙/예시)

### 4.1 OpenAPI
- docs/v2_specs/03_api/v2_legacy_openapi.yaml
- docs/v2_specs/03_api/v2_openapi.json

### 4.2 도메인별 계약 문서
- System: docs/v2_specs/03_api/v2_system_api_contract_ko.md
- Auth/User: docs/v2_specs/03_api/v2_auth_user_api_contract_ko.md
- Game: docs/v2_specs/03_api/v2_game_api_contract_ko.md
- Mission/Streak: docs/v2_specs/03_api/v2_mission_streak_api_contract_ko.md
- Inventory/Shop: docs/v2_specs/03_api/v2_inventory_shop_api_contract_ko.md
- Team Battle: docs/v2_specs/03_api/v2_team_battle_api_contract_ko.md
- Ticket Zero: docs/v2_specs/03_api/v2_ticket_zero_api_contract_ko.md
- Golden: docs/v2_specs/07_golden/v2_golden_api_contract_ko.md
- Admin Ops: docs/v2_specs/03_api/v2_admin_ops_api_contract_ko.md
- Ops Execution: docs/v2_specs/05_ops/v2_ops_execution_api_contract_ko.md

## 5. 공통 계약 규칙
### 5.1 버전 경로
- 모든 V2 API는 `/api/v2/` 프리픽스 고정

### 5.2 인증/헤더
- Authorization: Bearer <token>
- Admin 요청은 ROLE 기반 관리자 토큰 필수

### 5.3 공통 에러 포맷
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Korean message",
    "trace_id": "uuid"
  }
}
```

### 5.4 시간 기준
- 비즈니스 날짜/리셋 기준: KST, 오전 9시

## 6. 변경/확정 규칙
- OpenAPI 스키마 변경 시 도메인 계약 문서 동시 갱신
- 신규 엔드포인트는 도메인 계약 문서 추가 후 OpenAPI 반영
- v1 엔드포인트 재사용 금지 (v2-only)

## 7. QA/검증
- OpenAPI 경로와 실제 라우터 경로 일치
- 계약 문서와 응답 스키마 일치
- 공통 에러 포맷 준수

## 8. 변경 이력
- v1.0 (2026-01-24, GitHub Copilot): 최초 작성
